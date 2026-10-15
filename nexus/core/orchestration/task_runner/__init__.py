import os
import re
import time
import logging
from rich.console import Console
from core.tui import tui_engine, TaskProgress
from core.state import estimate_tokens
from core.utils import _safe_read
from core.llm_engine import _call_llm_silent, LocalLLMTimeoutError
from core.agents.sandbox import run_terminal_command
from core.agents.registry import AgentRegistry
from core.skills.registry import SkillRegistry
from core.event_bus import event_bus, EventType

from core.orchestration.task_runner.validators import DoDValidator
from core.orchestration.task_runner.context_managers import TaskContextManager
from core.orchestration.task_runner.executors import TaskExecutor

logger = logging.getLogger("jellyfish.orchestration.task_runner")
console = Console()

MAX_RETRIES = 3  # FASE 4: Límite de escalada para reintentos automáticos
MAX_DEBATE_CYCLES = 3  # FASE 5: Límite del Juez (Circuit Breaker) en debates Multi-Agente

AGENT_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "thought_process": {
            "type": "string",
            "description": "El razonamiento del agente sobre la tarea o paso actual."
        },
        "run_command": {
            "type": "string",
            "description": "Comando opcional a ejecutar en la terminal (ej. 'pytest'). Dejar vacío si no se requiere."
        },
        "ask_user": {
            "type": "string",
            "description": "Pregunta interactiva opcional para el usuario. Dejar vacío si no se requiere."
        },
        "target_file": {
            "type": "string",
            "description": "Ruta relativa del archivo a crear o modificar. Dejar vacío si no aplica."
        },
        "source_code": {
            "type": "string",
            "description": "Contenido completo del archivo. Dejar vacío si no aplica."
        }
    },
    "required": ["thought_process", "run_command", "ask_user", "target_file", "source_code"]
}

SENTINEL_HEALER_SYSTEM = """Eres @Sentinel, el agente experto de control de calidad, depuración y auto-curación de Jellyfish OS.
Tu misión es recibir una tarea técnica, los archivos de código que se generaron, y el log detallado del error de compilación, sintaxis o DoD.
Debes analizar el log de error para diagnosticar exactamente qué causó el fallo.

Tienes tres opciones de respuesta. Debes elegir la más adecuada y responder en el formato exacto:

1) AUTO_FIX: Si puedes corregir el código del archivo que falló directamente (ej: añadir un import, corregir sintaxis YAML, cambiar una línea de código).
Formato de respuesta:
[AUTO_FIX]
Explicación breve de la corrección.
<write_file path="ruta/del/archivo.ext">
contenido del archivo corregido...
</write_file>

2) FEEDBACK: Si la corrección requiere lógica compleja en múltiples archivos o reestructuraciones que debe hacer el desarrollador original.
Formato de respuesta:
[FEEDBACK]
Instrucciones detalladas paso a paso para corregir el error en el próximo intento.

3) ASK_USER: Si necesitas aclarar requisitos críticos, decisiones de diseño o permisos especiales del usuario.
Formato de respuesta:
[ASK_USER]
Escribe la pregunta específica y directa para el usuario.
"""

def topological_sort(tasks: list[dict]) -> list[dict]:
    """Ordena las tareas del sprint respetando sus dependencias declaradas (DAG)."""
    task_map = {t["id"]: t for t in tasks}
    adj = {t["id"]: [] for t in tasks}
    in_degree = {t["id"]: 0 for t in tasks}
    
    for t in tasks:
        deps = t.get("dependencies", [])
        for dep in deps:
            if dep in task_map:
                adj[dep].append(t["id"])
                in_degree[t["id"]] += 1
                
    from collections import deque
    queue = deque([t["id"] for t in tasks if in_degree[t["id"]] == 0])
    
    sorted_ids = []
    while queue:
        u = queue.popleft()
        sorted_ids.append(u)
        for v in adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
                
    if len(sorted_ids) != len(tasks):
        logger.warning("Ciclo detectado en dependencias de tareas, usando orden original.")
        return tasks
        
    return [task_map[tid] for tid in sorted_ids]


class TaskRunnerPhase:
    """Fase 3 del desarrollo autónomo: Task Runner, ReAct loop y control transaccional."""

    def __init__(self, orchestrator):
        self.orchestrator = orchestrator
        self.validator = DoDValidator(orchestrator)
        self.ctx_manager = TaskContextManager(orchestrator)
        self.executor = TaskExecutor(orchestrator)

    def _run_strict_subprocess_dod_validation(self, project_path: str, created_files: list[str], output_file: str) -> tuple[bool, str]:
        return self.validator.run_strict_subprocess_dod_validation(project_path, created_files, output_file)

    def _run_sentinel_auto_healing(
        self,
        task_id: str,
        agent_name: str,
        task_desc: str,
        output_file: str,
        error_log: str,
        created_files: list[str]
    ) -> tuple[str, str]:
        return self.executor.run_sentinel_auto_healing(
            task_id, agent_name, task_desc, output_file, error_log, created_files, self._get_user_input_nonblocking
        )

    def _run_swarm_consensus_debate(self, task_id_str: str, developer_agent: str, task_desc: str, output_file: str, file_content: str, attempt: int, task=None, tasks=None) -> tuple[bool, str, bool]:
        return self.executor.run_swarm_consensus_debate(
            task_id_str, developer_agent, task_desc, output_file, file_content, attempt, MAX_DEBATE_CYCLES, task, tasks
        )

    def _reconcile_missing_docker_context_files(self, created_files: list[str]) -> None:
        self.ctx_manager.reconcile_missing_docker_context_files(created_files)

    def _build_valid_fallback_content(self, task_desc: str, output_file: str) -> str:
        """Genera contenido de andamiaje sintácticamente válido según la extensión del archivo."""
        ext = os.path.splitext(output_file)[1].lower()
        if ext == ".py":
            return (
                f"# {task_desc}\n"
                '"""\nComponente o especificación andamiada automáticamente por Jellyfish OS.\n"""\n\n'
                "def main():\n"
                '    """Punto de entrada principal para el componente."""\n'
                "    pass\n\n"
                'if __name__ == "__main__":\n'
                "    main()\n"
            )
        elif ext in (".js", ".ts", ".jsx", ".tsx"):
            return (
                f"// {task_desc}\n"
                "/**\n * Componente o especificación andamiada automáticamente por Jellyfish OS.\n */\n"
                "export function main() {\n"
                "  return true;\n"
                "}\n"
            )
        elif ext == ".dart":
            return (
                f"// {task_desc}\n"
                "void main() {\n"
                "  // Componente andamiado automáticamente\n"
                "}\n"
            )
        elif ext == ".cpp" or ext == ".h" or ext == ".hpp":
            return (
                f"// {task_desc}\n"
                "#include <iostream>\n\n"
                "int main() {\n"
                "    std::cout << \"Placeholder autogenerado\" << std::endl;\n"
                "    return 0;\n"
                "}\n"
            )
        return f"# {task_desc}\n# Placeholder autogenerado\n"

    def _get_user_input_nonblocking(self, prompt: str) -> str:
        """Captura input del usuario en un bucle interactivo TUI no bloqueante o CLI standard."""
        import sys
        import select
        
        # Omitir si estamos corriendo en un test sin stdin interactivo
        if not sys.stdin.isatty():
            return "y"
            
        console.print(prompt, end="")
        sys.stdout.flush()
        
        # Esperar 60 segundos por input
        rlist, _, _ = select.select([sys.stdin], [], [], 60.0)
        if rlist:
            return sys.stdin.readline().strip()
        else:
            console.print("\n[dim]✗ Timeout agotado (60s). Asumiendo confirmación afirmativa por defecto (Dry Run).[/dim]")
            return "y"

    def run(self, user_idea: str) -> None:
        """Parsea el tablero de la agencia y ejecuta cada tarea con su agente asignado."""
        tasks = []
        try:
            import json
            json_filename = self.orchestrator.board_filename.replace(".md", ".json")
            json_path = os.path.join(self.orchestrator.project_path, json_filename)
            if os.path.isfile(json_path):
                with open(json_path, "r", encoding="utf-8") as f:
                    tasks = json.load(f)
                    console.print(f"[dim]       ⚙ Tablero JSON estructurado cargado exitosamente.[/dim]")
        except Exception as je:
            logger.warning("Error leyendo tablero JSON: %s. Reintentando por Markdown.", je)

        if not tasks:
            from core.project_orchestrator import _parse_sprint_tasks
            board = self.orchestrator._read_project_file(self.orchestrator.board_filename)
            tasks = _parse_sprint_tasks(board)

        if not tasks:
            console.print(f"⚠ No se encontraron tareas en el tablero {self.orchestrator.board_filename}.")
            return

        # Ordenamiento topológico del Grafo Dirigido (DAG)
        tasks = topological_sort(tasks)

        console.print(
            f"\n━━━ FASE 3: 🚀 Task Runner — {len(tasks)} tareas ordenadas por dependencias (DAG) ━━━\n"
        )

        for i, task in enumerate(tasks):
            task_num = i + 1
            agent_name = task["agent"].replace("`", "").strip()
            original_task_desc = task["task"]
            task_desc = original_task_desc
            output_file = task.get("output_file", "").strip().replace("`", "")
            task_id_str = task.get("id", f"T-{task_num:03d}").replace("*", "").replace("`", "").strip()

            if not output_file or output_file == "—":
                output_file = f"TASK_{task_id_str.replace('-', '_')}.md"

            files_to_generate = [f.strip() for f in output_file.split(",")] if "," in output_file else [output_file]

            # Verificar que las dependencias de la tarea estén completadas en el Blackboard
            deps_ok = True
            missing_dep = ""
            for dep_id in task.get("dependencies", []):
                dep_status = self.orchestrator.state.blackboard.get(f"task_status_{dep_id}")
                if dep_status != "completed":
                    deps_ok = False
                    missing_dep = dep_id
                    break
            if not deps_ok:
                self.orchestrator.state.blackboard.set(f"task_status_{task_id_str}", "blocked")
                task["status"] = "BLOCKED"
                task["state"] = "BLOCKED"
                self.orchestrator._save_board(tasks)
                event_bus.publish(EventType.TASK_BLOCKED, {
                    "task_id": task_id_str,
                    "missing_dep": missing_dep,
                    "agent_name": agent_name
                })
                self.orchestrator.metrics.append({
                    "fase": f"@{agent_name} ({task_id_str})",
                    "detalle": f"Bloqueada por dependencia: {missing_dep}",
                    "tiempo": 0.0,
                    "status": "⚠️ BLOCKED",
                })
                continue

            # Omitir tareas completadas o fallidas si estamos reanudando
            if task.get("status") in ("DONE", "HECHO", "FAILED") or task.get("state") in ("DONE", "HECHO", "FAILED"):
                status_lbl = "YA COMPLETADO" if task.get("status") in ("DONE", "HECHO") else "MARCADA COMO FALLIDA"
                console.print(
                    f"[bold green]  [{task_num}/{len(tasks)}] {task_id_str}:[/bold green] "
                    f"[dim]{status_lbl} (Saltando ejecución)[/dim]"
                )
                self.orchestrator.state.blackboard.set(f"task_status_{task_id_str}", "completed" if "COMPLETADO" in status_lbl else "failed")
                continue

            # Bucle de Retroalimentación Autónoma (Auto-Retry)
            task_retries = 0
            last_error_log = ""
            success_task = False
            task_result = ""
            created_files = []

            while task_retries < MAX_RETRIES:
                event_bus.publish(EventType.AGENT_STATUS_CHANGE, {"agent": agent_name, "status": "Ejecutando"})
                self.orchestrator.state.global_status = "PROCESS"

                event_bus.publish(EventType.TASK_STARTED, {
                    "task_num": task_num,
                    "total_tasks": len(tasks),
                    "task_id": task_id_str,
                    "task_retries": task_retries,
                    "max_retries": MAX_RETRIES,
                    "task_desc": task_desc,
                    "agent_name": agent_name,
                    "output_file": output_file
                })

                # Iniciar la transacción Git o tomar Snapshot
                use_microbranch, original_branch_or_snapshot = self.ctx_manager.start_transaction(task_id_str)
                snapshot_created = not use_microbranch

                t0 = time.perf_counter()

                agent_prompt = self.orchestrator._load_agent_prompt(agent_name)
                if not agent_prompt:
                    agent_prompt = f"Eres @{agent_name}, un especialista técnico del equipo de desarrollo."

                py_agent = AgentRegistry.get(agent_name)
                task_context = {
                    "project_path": self.orchestrator.project_path,
                    "output_file": output_file,
                    "task_id": task_id_str,
                    "agent_name": agent_name,
                }

                # Hook pre_execute
                if py_agent:
                    try:
                        py_agent.pre_execute(task, task_context)
                    except Exception as pre_err:
                        logger.warning("pre_execute de @%s falló: %s", agent_name, pre_err)

                # Inyección selectiva de skills
                skills_context = ""
                relevant_skills = SkillRegistry.get_skills_for_task(
                    task_desc,
                    agency=getattr(self.orchestrator.state, "active_agency", "")
                )
                if relevant_skills:
                    skill_blocks = []
                    for sk in relevant_skills:
                        try:
                            skill_blocks.append(f"### SKILL: {sk.name}\n{sk.get_instructions()}")
                        except Exception as sk_err:
                            logger.warning("Skill '%s' falló en get_instructions: %s", sk.name, sk_err)
                    if skill_blocks:
                        skills_context = (
                            "\n\n[SKILLS RELEVANTES PARA ESTA TAREA]\n"
                            + "\n\n".join(skill_blocks)
                            + "\n"
                        )

                accumulated = self.orchestrator._build_intelligent_context(task_desc, output_file)

                system = (
                    f"{agent_prompt}\n\n"
                    f"{skills_context}"
                    f"[TAREA ASIGNADA POR EL SCRUM MASTER]\n"
                    f"ID: {task_id_str}\n"
                    f"Descripción: {task_desc}\n"
                    f"Tu entregable: Genera el contenido COMPLETO del archivo {output_file}.\n"
                    f"REGLA CRÍTICA DE RESPUESTA: Debes responder ÚNICAMENTE con un objeto JSON que cumpla con el esquema requerido, sin comentarios conversacionales, saludos ni bloques markdown de código triples fuera de este JSON.\n\n"
                    f"[CAPACIDAD DE EJECUCIÓN DIRECTA (ReAct - Estructurado)]\n"
                    f"Tienes la capacidad de ejecutar comandos en el terminal de forma autónoma durante esta tarea. "
                    f"Si necesitas verificar si un archivo existe, ver su contenido, verificar versiones, "
                    f"ejecutar un script de prueba o verificar la compilación antes de entregar, puedes hacerlo llenando la propiedad 'run_command' de tu JSON con el comando correspondiente.\n"
                    f"El sistema ejecutará el comando y te devolverá el output. Después de recibir la respuesta en el siguiente turno, podrás continuar con tu razonamiento o solicitar más comandos.\n\n"
                    f"[CONSULTAS HITL (Interactivas)]\n"
                    f"REGLA DE AUTONOMÍA ESTRICTA: NUNCA uses 'ask_user' para pedir permiso de ver o editar archivos (ej. '¿Deseas ver el contenido de docker-compose.yml?'), ni para preguntas de cortesía o confirmaciones triviales. Construye de forma 100% AUTÓNOMA. Si vas a modificar o ver un archivo, usa 'run_command' directamente sin pedir permiso al usuario. Únicamente puedes usar 'ask_user' si existe un bloqueo técnico insalvable o una ambigüedad crítica de negocio sin respuesta por defecto.\n\n"
                    f"[ENTREGA DE ARCHIVOS]\n"
                    f"Cuando hayas terminado la tarea y validado los resultados satisfactoriamente, llena las propiedades 'target_file' y 'source_code' con la ruta y contenido completo del archivo que has construido/modificado. En este punto, 'run_command' y 'ask_user' deben estar vacíos para concluir la tarea.\n\n"
                    f"[REGLA DE DECISIÓN TECNOLÓGICA]\n"
                    f"Si la tecnología no ha sido definida de forma explícita, asume los estándares modernos de la industria recomendados para este tipo de aplicación (ej. Python/FastAPI/Node.js para backend, Flutter/React Native para móvil, PostgreSQL/SQLite para BD, Docker/Docker-Compose para infraestructura). Procede a generar el código y entregables completos sin detenerte.\n\n"
                    f"[REGLA DE ENTORNO ESTRICTA]\n"
                    f"Eres un desarrollador de software escribiendo código en un entorno local, NO eres un administrador de sistemas (sysadmin). Tienes ESTRICTAMENTE PROHIBIDO intentar reconfigurar la máquina host, instalar paquetes del sistema operativo (apt, dnf, pacman, brew), modificar el directorio /etc, o utilizar comandos con 'sudo'. Tu única responsabilidad es escribir, corregir y guardar el código fuente. Si una prueba falla por problemas de infraestructura, red, o permisos del host, NO intentes arreglar el entorno; aborta la ejecución y solicita ayuda utilizando la propiedad 'ask_user'.\n\n"
                    f"[REGLAS DE INFRAESTRUCTURA]\n"
                    f"REGLA ESTRUCTURAL ESTRICTA: NUNCA referencies un directorio, archivo o contexto de compilación (ej. en docker-compose) sin haber verificado primero que existe usando comandos de consola. Si configuras un servicio que requiere compilación (build), ESTÁS OBLIGADO a crear el `Dockerfile` correspondiente en la ruta exacta que especificaste y a generar el `package.json` o `requirements.txt` base si no existen. NO puedes dar una tarea de DevOps por terminada si faltan los archivos de construcción.\n"
                    f"REGLA DE SINTAXIS DE DOCKER: NUNCA mezcles instrucciones secuenciales de construcción de imágenes (como 'FROM', 'RUN', 'COPY', 'WORKDIR') dentro de un archivo 'docker-compose.yml'. Recuerda que 'docker-compose.yml' es estrictamente un archivo YAML de orquestación de servicios y contenedores, mientras que 'Dockerfile' contiene la receta secuencial para la imagen. La mezcla de sintaxis es un error sintáctico crítico.\n\n"
                )

                user_prompt = (
                    f"IDEA ORIGINAL DEL USUARIO:\n{user_idea}\n\n"
                    f"DOCUMENTOS PREVIOS DEL PROYECTO:\n{accumulated}\n\n"
                    f"TAREA: {task_desc}\n"
                    f"Genera el contenido completo de {output_file}."
                )

                capabilities_str = ""
                cap_path = os.path.join(self.orchestrator.project_path, "env_capabilities.json")
                if os.path.isfile(cap_path):
                    capabilities_str = _safe_read(cap_path)

                env_capabilities_prompt = ""
                if capabilities_str:
                    env_capabilities_prompt = (
                        f"\n\n[ENTORNO REAL DEL HOST / CONTENEDORES]\n"
                        f"Tu código debe ser 100% compatible con las siguientes herramientas y versiones reales del entorno:\n"
                        f"```json\n{capabilities_str}\n```\n"
                        f"Asegúrate de alinear las versiones de Gradle, Kotlin, Python, Room, etc., a estas capacidades. "
                        f"No propongas herramientas ni configuraciones incompatibles con estas versiones."
                    )

                system = system + env_capabilities_prompt

                task_desc_lower = task_desc.lower()
                if any(kw in task_desc_lower for kw in ["docker", "compose", "servidor", "despliegue"]):
                    infra_validation_prompt = (
                        "\n\n[INSTRUCCIÓN DE AUTO-VALIDACIÓN DE INFRAESTRUCTURA]\n"
                        "Dado que esta tarea involucra docker, compose, servidor o despliegue, ESTÁS OBLIGADO "
                        "a ejecutar obligatoriamente 'docker compose config' o 'docker compose build --no-cache' "
                        "usando la etiqueta <run_command> como un paso ReAct para validar la configuración o compilación "
                        "de los contenedores ANTES de emitir tu entregable final y finalizar la tarea con [TAREA_COMPLETADA]."
                    )
                    system = system + infra_validation_prompt

                last_task_result = ""
                task_elapsed = 0.0
                feedback = ""
                short_desc = f"Tarea {task_id_str}: {task_desc[:40]}..."

                max_attempts = 5
                build_cmd = self.orchestrator._detect_compile_command()

                is_modifying_target_docs = (
                    output_file.lower() in ("architecture.md", "jellyfish_history.md") or
                    any(doc in task_desc.lower() for doc in ("architecture.md", "jellyfish_history.md"))
                )
                if is_modifying_target_docs:
                    from core.project_manager import get_environment_and_dependencies_summary
                    summary_context = get_environment_and_dependencies_summary(self.orchestrator.state)
                    system = system + "\n\n" + summary_context

                base_messages = [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt}
                ]

                try:
                    with TaskProgress(tui_engine, f"auto_task_{i}", short_desc, agent=agent_name) as progress:
                        for attempt in range(1, max_attempts + 1):
                            attempt_t0 = time.perf_counter()

                            task_result = ""
                            created_files = []
                            attempt_success = True

                            for idx_sub, sub_file in enumerate(files_to_generate):
                                sub_task_context = {
                                    "project_path": self.orchestrator.project_path,
                                    "output_file": sub_file,
                                    "task_id": task_id_str,
                                    "agent_name": agent_name,
                                }

                                if py_agent:
                                    try:
                                        py_agent.pre_execute(task, sub_task_context)
                                    except Exception as pre_err:
                                        logger.warning("pre_execute de @%s falló: %s", agent_name, pre_err)

                                accumulated = self.orchestrator._build_intelligent_context(task_desc, sub_file)

                                sub_system = system
                                sub_system = sub_system.replace(
                                    f"Tu entregable: Genera el contenido COMPLETO del archivo {output_file}.",
                                    f"Tu entregable: Genera el contenido COMPLETO del archivo {sub_file}."
                                )
                                if f"Genera el contenido COMPLETO del archivo {sub_file}" not in sub_system:
                                    sub_system += f"\n\n[REGLA ADICIONAL]\nTu entregable: Genera el contenido COMPLETO del archivo '{sub_file}'."

                                if len(files_to_generate) > 1:
                                    sub_system += f"\n\n[INSTRUCCIÓN SECUENCIAL MULTI-ARCHIVO]\nEstás generando los archivos del proyecto uno por uno. El archivo actual a generar es: '{sub_file}'."
                                    if idx_sub > 0:
                                        already_done = ", ".join(files_to_generate[:idx_sub])
                                        sub_system += f" Ya has generado previamente los archivos: {already_done}. Concéntrate ÚNICAMENTE en generar el código completo para '{sub_file}'."

                                sub_user_prompt = (
                                    f"IDEA ORIGINAL DEL USUARIO:\n{user_idea}\n\n"
                                    f"DOCUMENTOS PREVIOS DEL PROYECTO:\n{accumulated}\n\n"
                                    f"TAREA: {task_desc}\n"
                                    f"Genera el contenido completo de {sub_file}."
                                )

                                sub_base_messages = [
                                    {"role": "system", "content": sub_system},
                                    {"role": "user", "content": sub_user_prompt}
                                ]

                                current_messages = list(sub_base_messages)
                                if attempt > 1 and feedback:
                                    current_messages.append({"role": "user", "content": f"[RETROALIMENTACIÓN DE INTENTO ANTERIOR]\n{feedback}"})

                                sub_task_result = ""
                                react_messages = list(current_messages)
                                max_react_steps = 15

                                from core.config import resolve_agent_role_category

                                if attempt == 1 and py_agent and resolve_agent_role_category(agent_name) == "executor" and hasattr(py_agent, "execute_local_microtask_loop"):
                                    try:
                                        micro_context = {
                                            "project_path": self.orchestrator.project_path,
                                            "accumulated_context": accumulated,
                                            "output_file": sub_file
                                        }
                                        local_code = py_agent.execute_local_microtask_loop(self.orchestrator.state, task, micro_context)
                                        if local_code and local_code.strip():
                                            import json
                                            sub_task_result = json.dumps({
                                                "thought_process": "Código generado localmente por el agente.",
                                                "run_command": "",
                                                "ask_user": "",
                                                "target_file": sub_file,
                                                "source_code": local_code
                                            })
                                    except Exception as micro_err:
                                        logger.warning("Error en execute_local_microtask_loop de @%s: %s. Continuando flujo normal.", agent_name, micro_err)

                                if not sub_task_result:
                                    for step in range(1, max_react_steps + 1):
                                        response_chunk = _call_llm_silent(
                                            self.orchestrator.state, react_messages,
                                            agent_name=agent_name,
                                            json_schema=AGENT_OUTPUT_SCHEMA
                                        )

                                        if not response_chunk:
                                            break

                                        import json
                                        try:
                                            parsed = json.loads(response_chunk)
                                            required_fields = ["thought_process", "run_command", "ask_user", "target_file", "source_code"]
                                            for field in required_fields:
                                                if field not in parsed:
                                                    raise ValueError(f"Falta el campo requerido '{field}' en la respuesta del agente.")
                                        except (json.JSONDecodeError, ValueError) as json_err:
                                            logger.warning("Respuesta de agente malformada JSON o campos faltantes: %s", json_err)
                                            react_messages.append({"role": "assistant", "content": response_chunk or "{}"})
                                            react_messages.append({
                                                "role": "user",
                                                "content": (
                                                    f"ERROR DE FORMATO JSON: Tu respuesta anterior no cumple con el esquema JSON requerido o no es un JSON válido.\n"
                                                    f"Detalles del error: {json_err}\n"
                                                    f"Por favor, responde estrictamente con un JSON que cumpla el esquema: {json.dumps(AGENT_OUTPUT_SCHEMA)}"
                                                )
                                            })
                                            continue

                                        thought = parsed.get("thought_process", "").strip()
                                        run_cmd = parsed.get("run_command", "").strip()
                                        ask_usr = parsed.get("ask_user", "").strip()

                                        # Interceptor HITL
                                        if ask_usr:
                                            trivial_keywords = ["desea ver", "deseas ver", "quieres ver", "puedo modificar", "puedo cambiar", "confirmación", "deseas corregir"]
                                            is_trivial = any(kw in ask_usr.lower() for kw in trivial_keywords)
                                            ask_usr_count = getattr(self, "_ask_usr_count", 0) + 1
                                            self._ask_usr_count = ask_usr_count

                                            if is_trivial or ask_usr_count >= 2:
                                                console.print(f"       [dim]🤖 [Autonomía Supresión HITL]: Interceptada consulta trivial de @{agent_name}: '{ask_usr}' -> Procediendo autónomamente.[/dim]")
                                                react_messages.append({"role": "assistant", "content": response_chunk})
                                                react_messages.append({
                                                    "role": "user",
                                                    "content": "REGLA DE AUTONOMÍA: No pidas permiso para ver o editar archivos. Procede de forma 100% autónoma realizando las modificaciones necesarias en el código y concluye la tarea entregando las propiedades 'target_file' y 'source_code'."
                                                })
                                                continue

                                            console.print("\n[bold yellow]──────────────────────────────────────────────────────────────────────[/bold yellow]")
                                            console.print(f"[bold yellow]🤔 CONSULTA HITL DE @{agent_name}:[/bold yellow]")
                                            console.print(f"[yellow]{ask_usr}[/yellow]")
                                            console.print("[bold yellow]──────────────────────────────────────────────────────────────────────[/bold yellow]")

                                            user_response = self._get_user_input_nonblocking("✍ Escribe tu respuesta: ")

                                            react_messages.append({"role": "assistant", "content": response_chunk})
                                            user_msg = {"role": "user", "content": f"Respuesta del usuario a tu consulta: {user_response}"}
                                            react_messages.append(user_msg)
                                            continue

                                        # Detectar comandos
                                        if run_cmd:
                                            run_cmd_lower = run_cmd.lower()
                                            if "sudo " in run_cmd_lower or "apt " in run_cmd_lower or "apt-get" in run_cmd_lower or "pacman" in run_cmd_lower or "dnf " in run_cmd_lower:
                                                console.print(f"       🛡️ [Seguridad Host]: Bloqueado intento de modificar sistema host ({run_cmd}).")
                                                react_messages.append({"role": "assistant", "content": response_chunk})
                                                react_messages.append({
                                                    "role": "user",
                                                    "content": f"RECHAZO DE SEGURIDAD DE ENTORNO: El comando '{run_cmd}' fue rechazado porque tienes ESTRICTAMENTE PROHIBIDO ejecutar sudo, apt o modificar el sistema host. Escribe el código fuente usando paquetes locales (venv, npm, o Dockerfile) y entrega las propiedades 'target_file' y 'source_code'."
                                                })
                                                continue

                                            console.print(f"       ⚙ Agente @{agent_name} ejecutando comando ReAct: {run_cmd} (Archivo: {sub_file})")

                                            ret_dict = {'returncode': 0}
                                            cmd_output = run_terminal_command(
                                                run_cmd,
                                                self.orchestrator.state,
                                                silent_history=True,
                                                timeout=120,
                                                force_confirm=False,
                                                return_code_dict=ret_dict
                                            )

                                            urgency_prompt = "Analiza el resultado y continúa con la tarea. Si has terminado, llena 'target_file' y 'source_code' y deja vacíos 'run_command' y 'ask_user'."
                                            if step >= max_react_steps - 3:
                                                urgency_prompt = f"Te quedan pocos pasos ReAct. Genera tu JSON final entregando el archivo '{sub_file}' de inmediato."

                                            react_messages.append({"role": "assistant", "content": response_chunk})
                                            react_messages.append({
                                                "role": "user",
                                                "content": f"Resultado de ejecución (Código {ret_dict['returncode']}):\n```\n{cmd_output[:3000]}\n```\n{urgency_prompt}"
                                            })
                                            continue

                                        sub_task_result = response_chunk
                                        break

                                if not sub_task_result:
                                    attempt_success = False
                                    last_error_log = f"El modelo LLM no generó contenido para la tarea {task_id_str} ({sub_file})."
                                    break

                                sub_created = []
                                try:
                                    import json
                                    parsed = json.loads(sub_task_result)
                                    target_file = parsed.get("target_file", "").strip()
                                    source_code = parsed.get("source_code", "").strip()

                                    if target_file and source_code:
                                        if py_agent:
                                            try:
                                                source_code = py_agent.post_execute(source_code, sub_task_context)
                                            except Exception as post_err:
                                                logger.warning("post_execute de @%s falló: %s", agent_name, post_err)

                                        self.orchestrator._write_project_file(target_file, source_code)
                                        sub_created = [target_file]
                                        sub_task_result = source_code
                                    else:
                                        fallback_content = self._build_valid_fallback_content(task_desc, sub_file)
                                        self.orchestrator._write_project_file(sub_file, fallback_content)
                                        sub_created = [sub_file]
                                        sub_task_result = fallback_content
                                except Exception as e:
                                    logger.error("Error al procesar JSON o escribir archivo: %s", e)
                                    fallback_content = self._build_valid_fallback_content(task_desc, sub_file)
                                    self.orchestrator._write_project_file(sub_file, fallback_content)
                                    sub_created = [sub_file]
                                    sub_task_result = fallback_content

                                created_files.extend(sub_created)
                                task_result += f"\n\n[FILE: {sub_file}]\n{sub_task_result}"

                            attempt_elapsed = time.perf_counter() - attempt_t0
                            task_elapsed += attempt_elapsed

                            if not attempt_success:
                                if attempt == max_attempts:
                                    for sub_file in files_to_generate:
                                        full_sub_path = os.path.join(self.orchestrator.project_path, sub_file)
                                        if not os.path.exists(full_sub_path):
                                            fallback_content = self._build_valid_fallback_content(task_desc, sub_file)
                                            self.orchestrator._write_project_file(sub_file, fallback_content)
                                            created_files.append(sub_file)
                                            task_result += f"\n\n[FILE: {sub_file}]\n{fallback_content}"
                                else:
                                    continue

                            # Auto-reconciliación Docker
                            self.ctx_manager.reconcile_missing_docker_context_files(created_files)

                            infra_ok = True
                            infra_error_msg = ""

                            # Validación estática
                            syntax_ok, syntax_error_msg = self.validator.validate_static_syntax(created_files)

                            # Validación de archivos huérfanos
                            orphaned_ok = True
                            orphaned_msg = ""
                            if syntax_ok:
                                orphaned_ok, orphaned_msg = self.validator.validate_orphaned_files(created_files)

                            # Validación por subproceso (DoD)
                            exec_subproc_ok, exec_subproc_reason = self.validator.run_strict_subprocess_dod_validation(
                                self.orchestrator.project_path, created_files, output_file
                            )

                            if not build_cmd:
                                if not infra_ok:
                                    dod_approved = False
                                    dod_reason = infra_error_msg
                                elif not syntax_ok:
                                    dod_approved = False
                                    dod_reason = f"Error de sintaxis estática detectado por el analizador: {syntax_error_msg}"
                                elif not orphaned_ok:
                                    dod_approved = False
                                    dod_reason = orphaned_msg
                                elif not exec_subproc_ok:
                                    dod_approved = False
                                    dod_reason = exec_subproc_reason
                                else:
                                    file_content = task_result if len(files_to_generate) > 1 else self.orchestrator._read_project_file(output_file)
                                    dod_approved, dod_reason, breaker_tripped = self.executor.run_swarm_consensus_debate(
                                        task_id_str, agent_name, task_desc, output_file, file_content, attempt, MAX_DEBATE_CYCLES, task, tasks
                                    )
                                    if breaker_tripped:
                                        success_task = False
                                        progress.fail()
                                        break
                                if dod_approved:
                                    event_bus.publish(EventType.TASK_COMPLETED, {"task_id": task_id_str, "reason": dod_reason, "agent_name": agent_name})
                                    success_task = True
                                    break
                                else:
                                    console.print(f"       ❌ DoD Rechazado: {dod_reason}")
                                    last_error_log = f"DoD rechazado: {dod_reason}"
                                    res_type, res_val = self.executor.run_sentinel_auto_healing(
                                        task_id_str, agent_name, task_desc, output_file, last_error_log, created_files, self._get_user_input_nonblocking
                                    )
                                    if res_type == "AUTO_FIX":
                                        syntax_ok, syntax_error_msg = self.validator.validate_static_syntax(created_files)
                                        if syntax_ok:
                                            orphaned_ok, orphaned_msg = self.validator.validate_orphaned_files(created_files)
                                        exec_subproc_ok, exec_subproc_reason = self.validator.run_strict_subprocess_dod_validation(
                                            self.orchestrator.project_path, created_files, output_file
                                        )
                                        if syntax_ok and orphaned_ok and exec_subproc_ok:
                                            file_content = task_result if len(files_to_generate) > 1 else self.orchestrator._read_project_file(output_file)
                                            dod_approved, dod_reason, breaker_tripped = self.executor.run_swarm_consensus_debate(
                                                task_id_str, agent_name, task_desc, output_file, file_content, attempt, MAX_DEBATE_CYCLES, task, tasks
                                            )
                                            if breaker_tripped:
                                                success_task = False
                                                progress.fail()
                                                break
                                            if dod_approved:
                                                console.print("       [green]🛡️ Auto-Curación exitosa! La validación DoD ha sido aprobada tras la corrección de Sentinel.[/green]")
                                                event_bus.publish(EventType.TASK_COMPLETED, {"task_id": task_id_str, "reason": "Aprobado tras Auto-Curación de Sentinel", "agent_name": agent_name})
                                                success_task = True
                                                break
                                    if attempt < max_attempts:
                                        feedback = f"Rechazado por DoD: {dod_reason}. Diagnóstico de Sentinel: {res_val}. Corrige e intenta de nuevo."
                                    else:
                                        success_task = False
                                        progress.fail()
                                    continue

                            # DoD con build de compilador detectado
                            returncode, build_output = self.orchestrator._run_build_command(build_cmd)
                            if returncode == 0:
                                if not infra_ok:
                                    dod_approved = False
                                    dod_reason = infra_error_msg
                                elif not syntax_ok:
                                    dod_approved = False
                                    dod_reason = f"Error de sintaxis estática detectado por el analizador: {syntax_error_msg}"
                                elif not orphaned_ok:
                                    dod_approved = False
                                    dod_reason = orphaned_msg
                                elif not exec_subproc_ok:
                                    dod_approved = False
                                    dod_reason = exec_subproc_reason
                                else:
                                    file_content = task_result if len(files_to_generate) > 1 else self.orchestrator._read_project_file(output_file)
                                    dod_approved, dod_reason, breaker_tripped = self.executor.run_swarm_consensus_debate(
                                        task_id_str, agent_name, task_desc, output_file, file_content, attempt, MAX_DEBATE_CYCLES, task, tasks
                                    )
                                    if breaker_tripped:
                                        success_task = False
                                        progress.fail()
                                        break
                                if dod_approved:
                                    event_bus.publish(EventType.TASK_COMPLETED, {"task_id": task_id_str, "reason": dod_reason, "agent_name": agent_name})
                                    success_task = True
                                    break
                                else:
                                    console.print(f"       ❌ DoD Rechazado: {dod_reason}")
                                    last_error_log = f"DoD rechazado tras compilar con éxito: {dod_reason}"
                                    res_type, res_val = self.executor.run_sentinel_auto_healing(
                                        task_id_str, agent_name, task_desc, output_file, last_error_log, created_files, self._get_user_input_nonblocking
                                    )
                                    if res_type == "AUTO_FIX":
                                        returncode, build_output = self.orchestrator._run_build_command(build_cmd)
                                        if returncode == 0:
                                            syntax_ok, syntax_error_msg = self.validator.validate_static_syntax(created_files)
                                            exec_subproc_ok, exec_subproc_reason = self.validator.run_strict_subprocess_dod_validation(
                                                self.orchestrator.project_path, created_files, output_file
                                            )
                                            if syntax_ok and exec_subproc_ok:
                                                file_content = task_result if len(files_to_generate) > 1 else self.orchestrator._read_project_file(output_file)
                                                dod_approved, dod_reason, breaker_tripped = self.executor.run_swarm_consensus_debate(
                                                    task_id_str, agent_name, task_desc, output_file, file_content, attempt, MAX_DEBATE_CYCLES, task, tasks
                                                )
                                                if breaker_tripped:
                                                    success_task = False
                                                    progress.fail()
                                                    break
                                                if dod_approved:
                                                    console.print("       [green]🛡️ Auto-Curación exitosa! La validación DoD ha sido aprobada tras la corrección de Sentinel.[/green]")
                                                    event_bus.publish(EventType.TASK_COMPLETED, {"task_id": task_id_str, "reason": "Aprobado tras Auto-Curación de Sentinel", "agent_name": agent_name})
                                                    success_task = True
                                                    break
                                    if attempt < max_attempts:
                                        feedback = f"Rechazado por DoD: {dod_reason}. Diagnóstico de Sentinel: {res_val}. Corrige e intenta de nuevo."
                                    else:
                                        success_task = False
                                        progress.fail()
                            else:
                                last_error_log = f"Error de compilación: {build_output}"
                                res_type, res_val = self.executor.run_sentinel_auto_healing(
                                    task_id_str, agent_name, task_desc, output_file, last_error_log, created_files, self._get_user_input_nonblocking
                                )
                                if res_type == "AUTO_FIX":
                                    returncode, build_output = self.orchestrator._run_build_command(build_cmd)
                                    if returncode == 0:
                                        syntax_ok, syntax_error_msg = self.validator.validate_static_syntax(created_files)
                                        exec_subproc_ok, exec_subproc_reason = self.validator.run_strict_subprocess_dod_validation(
                                            self.orchestrator.project_path, created_files, output_file
                                        )
                                        if syntax_ok and exec_subproc_ok:
                                            file_content = task_result if len(files_to_generate) > 1 else self.orchestrator._read_project_file(output_file)
                                            dod_approved, dod_reason, breaker_tripped = self.executor.run_swarm_consensus_debate(
                                                task_id_str, agent_name, task_desc, output_file, file_content, attempt, MAX_DEBATE_CYCLES, task, tasks
                                            )
                                            if breaker_tripped:
                                                success_task = False
                                                progress.fail()
                                                break
                                            if dod_approved:
                                                console.print("       [green]🛡️ Auto-Curación exitosa! La validación DoD ha sido aprobada tras la corrección de Sentinel.[/green]")
                                                event_bus.publish(EventType.TASK_COMPLETED, {"task_id": task_id_str, "reason": "Aprobado tras Auto-Curación de Sentinel", "agent_name": agent_name})
                                                success_task = True
                                                break
                                if attempt < max_attempts:
                                    error_lines = self.orchestrator._extract_relevant_errors(build_output)
                                    feedback = f"Error de compilación:\n```\n{error_lines}\n```\nDiagnóstico de Sentinel: {res_val}. Corrige y vuelve a generar."
                                else:
                                    success_task = False
                                    progress.fail()

                        if success_task and task_result:
                            tokens = estimate_tokens(task_result)
                            progress.set_tokens(tokens)

                except LocalLLMTimeoutError as timeout_ex:
                    logger.error("Timeout del modelo local (GPU saturada) en la tarea %s: %s", task_id_str, timeout_ex)
                    success_task = False
                    last_error_log = str(timeout_ex)
                    task_retries = MAX_RETRIES
                except Exception as ex:
                    logger.error("Excepción durante intento de ejecución de tarea: %s", ex, exc_info=True)
                    success_task = False
                    last_error_log = f"Excepción interna del runner: {ex}"

                if success_task:
                    self.orchestrator.state.blackboard.set(f"task_status_{task_id_str}", "completed")
                    break
                else:
                    task_retries += 1
                    # Rollback git
                    self.ctx_manager.rollback_transaction(task_id_str, use_microbranch, original_branch_or_snapshot, snapshot_created)
                    
                    if task_retries < MAX_RETRIES:
                        task_desc = f"FIX REQUIRED: [Log del error: {last_error_log}]\nOriginal task description: {original_task_desc}"
                        console.print(f"       🔄 [Auto-Retry] Reintentando tarea {task_id_str} (Reintento {task_retries}/{MAX_RETRIES})...")
                    else:
                        self.orchestrator.state.global_status = "ERROR"
                        event_bus.publish(EventType.AGENT_STATUS_CHANGE, {"agent": agent_name, "status": "Inactivo"})
                        event_bus.publish(EventType.TASK_FAILED, {
                            "task_id": task_id_str,
                            "max_retries": MAX_RETRIES,
                            "error_log": last_error_log
                        })
                        
                        self.orchestrator.metrics.append({
                            "fase": f"@{agent_name} ({task_id_str})",
                            "detalle": f"Fallo Crítico: {last_error_log[:50]}...",
                            "tiempo": getattr(self, "task_elapsed", 0.0),
                            "status": "❌",
                        })

                        # Sentinel Interactive Pause (SIP)
                        self.orchestrator.state.set_pipeline_status("PIPELINE_PAUSED", {
                            "task_id": task_id_str,
                            "agent_name": agent_name,
                            "error_log": last_error_log,
                            "task_desc": original_task_desc,
                            "output_file": output_file
                        })
                        
                        from core.agency_orchestrator import AgencyOrchestrator
                        ceo = AgencyOrchestrator(self.orchestrator.state)
                        sentinel_res = ceo.run_sentinel_session()
                        
                        if not self.orchestrator.state.is_pipeline_paused() or sentinel_res in ("[RETRY]", "[FORCE_CONTINUE]"):
                            import json
                            json_filename = self.orchestrator.board_filename.replace(".md", ".json")
                            json_path = os.path.join(self.orchestrator.project_path, json_filename)
                            if os.path.isfile(json_path):
                                try:
                                    with open(json_path, "r", encoding="utf-8") as f:
                                        updated_tasks = json.load(f)
                                    for ut in updated_tasks:
                                        if ut.get("id") == task_id_str:
                                            task_desc = ut.get("task")
                                            task["task"] = task_desc
                                            task["status"] = ut.get("status")
                                            task["state"] = ut.get("state")
                                            break
                                except Exception as err_json:
                                    logger.warning("Error leyendo tablero actualizado tras SIP: %s", err_json)

                            if task.get("status") in ("DONE", "HECHO", "FAILED") or task.get("state") in ("DONE", "HECHO", "FAILED"):
                                if task.get("status") == "FAILED" or task.get("state") == "FAILED":
                                    self.orchestrator.state.blackboard.set(f"task_status_{task_id_str}", "failed")
                                else:
                                    self.orchestrator.state.blackboard.set(f"task_status_{task_id_str}", "completed")
                                break
                            
                            task_retries = 0
                            continue
                        
                        return

            if use_microbranch and success_task:
                self.ctx_manager.commit_transaction(task_id_str, use_microbranch, original_branch_or_snapshot)

            tokens = estimate_tokens(task_result) if task_result else 0
            status_symbol = "✅" if success_task else "⚠"
            status_text = "Completado con éxito" if success_task else "Completado con advertencias"

            self.orchestrator.metrics.append({
                "fase": f"@{agent_name} ({task_id_str})",
                "detalle": f"~{tokens:,} tokens → {output_file}",
                "tiempo": task_elapsed,
                "status": status_symbol,
            })

            # Actualizar DAILY.md
            self.orchestrator._write_task_handoff_with_status(task_id_str, agent_name, task_desc, output_file, status_text)

            # Actualizar DEVELOPMENT_LOG.md
            try:
                from core.orchestration.code_analyzer import format_analysis_for_log
                
                semantic_summary = ""
                summary_sys = "Eres el Escritor de Bitácoras de Jellyfish. Genera un resumen semántico de 1 sola oración y muy breve (máximo 15 palabras) de los cambios realizados en esta tarea."
                summary_user = f"Tarea: {task_desc}\nCódigo generado:\n{task_result[:1500] if task_result else 'Sin código'}"
                try:
                    summary_res = _call_llm_silent(
                        self.orchestrator.state,
                        [
                            {"role": "system", "content": summary_sys},
                            {"role": "user", "content": summary_user}
                        ],
                        provider=self.orchestrator.state.provider,
                        model=self.orchestrator.state.model
                    )
                    if summary_res:
                        semantic_summary = summary_res.strip().replace("\n", " ")
                except Exception as llm_err:
                    logger.warning("No se pudo generar el resumen semántico con LLM: %s", llm_err)
                
                if not semantic_summary:
                    semantic_summary = f"Completó la tarea: {task_desc[:60]}..."

                log_entry = format_analysis_for_log(
                    task_id=task_id_str,
                    agent_name=agent_name,
                    task_desc=task_desc,
                    created_files=created_files,
                    project_path=self.orchestrator.project_path,
                    semantic_summary=semantic_summary
                )

                log_filename = "DEVELOPMENT_LOG.md"
                existing_log = self.orchestrator._read_project_file(log_filename) or ""
                
                if not existing_log.strip():
                    existing_log = (
                        "# Jellyfish OS — Bitácora de Desarrollo Coherente\n\n"
                        "Este archivo documenta las modificaciones realizadas por cada agente en el pipeline.\n\n"
                    )
                
                updated_log = existing_log.rstrip() + "\n\n" + log_entry
                self.orchestrator._write_project_file(log_filename, updated_log)
                console.print("       [dim]✓ Bitácora de desarrollo actualizada (DEVELOPMENT_LOG.md)[/dim]")
            except Exception as log_err:
                logger.warning("No se pudo escribir en DEVELOPMENT_LOG.md: %s", log_err)

            if agent_name in self.orchestrator.state.agent_statuses:
                self.orchestrator.state.agent_statuses[agent_name] = "Inactivo"
            self.orchestrator.state.global_status = "OK"

            from datetime import datetime
            task["status"] = "DONE"
            task["state"] = "DONE"
            task["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            self.orchestrator._save_board(tasks)

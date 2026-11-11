import re
import logging
from rich.console import Console
from core.llm_engine import _call_llm_silent
from core.event_bus import event_bus, EventType

logger = logging.getLogger("jellyfish.orchestration.task_runner.executors")
console = Console()

class TaskExecutor:
    """Ejecutor para auto-curacion y debate del enjambre en task_runner.py."""

    def __init__(self, orchestrator):
        self.orchestrator = orchestrator

    def run_sentinel_auto_healing(
        self,
        task_id: str,
        agent_name: str,
        task_desc: str,
        output_file: str,
        error_log: str,
        created_files: list[str],
        input_getter
    ) -> tuple[str, str]:
        """Invoca a @Sentinel para diagnosticar y corregir el error."""
        from core.orchestration.build_healer import run_sentinel_auto_healing
        return run_sentinel_auto_healing(
            self.orchestrator,
            task_id,
            agent_name,
            task_desc,
            output_file,
            error_log,
            created_files,
            input_getter
        )

    def run_swarm_consensus_debate(
        self,
        task_id_str: str,
        developer_agent: str,
        task_desc: str,
        output_file: str,
        file_content: str,
        attempt: int,
        max_debate_cycles: int,
        task=None,
        tasks=None
    ) -> tuple[bool, str, bool]:
        """Bucle de Consenso del Enjambre entre @developer y @qa_engineer."""
        self.orchestrator.state.blackboard.set(f"code_{task_id_str}", file_content)
        event_bus.publish(EventType.CODE_SUBMITTED, {
            "task_id": task_id_str,
            "file": output_file,
            "developer": developer_agent,
            "attempt": attempt
        })
        console.print(f"[cyan]       [RECARGA] [Agent Swarm] Codigo enviado al pizarron para debate: @{developer_agent} -> @qa_engineer...[/cyan]")

        qa_prompt = (
            f"Eres @qa_engineer en el Enjambre Multi-Agente de Jellyfish OS.\n"
            f"Tu rol es auditar y evaluar con rigor extremo el codigo propuesto para el archivo '{output_file}'.\n"
            f"TAREA SOLICITADA: {task_desc}\n"
            f"CODIGO ENTREGADO POR @{developer_agent}:\n```\n{file_content[:3000]}\n```\n\n"
            f"INSTRUCCIONES DE DEBATE:\n"
            f"Si el codigo cumple con los requisitos y no tiene errores logicos criticos ni placeholders innecesarios, responde UNICAMENTE con:\n"
            f"[APPROVED]\nConsenso alcanzado: codigo verificado correctamente.\n\n"
            f"Si detectas errores de arquitectura, bugs o incumplimiento de requisitos, responde con:\n"
            f"[REJECTED]\nExplica claramente que debe corregir @{developer_agent} en su proximo ciclo de debate."
        )
        qa_messages = [
            {"role": "system", "content": "Eres @qa_engineer, critico riguroso del enjambre."},
            {"role": "user", "content": qa_prompt}
        ]
        try:
            import core.orchestration.task_runner as task_runner
            res = task_runner._call_llm_silent(self.orchestrator.state, qa_messages, agent_name="qa_engineer")
            qa_response = res[0] if isinstance(res, (tuple, list)) else str(res)
        except Exception as e:
            logger.warning("Error consultando a @qa_engineer en debate: %s", e)
            dod_ok, dod_reason = self.orchestrator._run_dod_validation(task_id_str, developer_agent, task_desc, output_file, file_content)
            return dod_ok, dod_reason, False

        if "[APPROVED]" in qa_response or "APPROVED" in qa_response[:50]:
            event_bus.publish(EventType.CODE_APPROVED, {"task_id": task_id_str, "reviewer": "qa_engineer"})
            console.print("       [green][CONSENSO] Consenso del Enjambre alcanzado: @qa_engineer aprobo la entrega.[/green]")
            return True, "Consenso alcanzado entre @developer y @qa_engineer.", False
        
        debates_key = f"debate_cycles_{task_id_str}"
        cycles = self.orchestrator.state.blackboard.get(debates_key, 0) + 1
        self.orchestrator.state.blackboard.set(debates_key, cycles)
        reason = qa_response.replace("[REJECTED]", "").strip() or "Rechazo de QA en el debate del enjambre."
        
        if cycles >= max_debate_cycles:
            logger.warning("El Juez: Tarea %s bloqueada tras %d ciclos de debate sin consenso.", task_id_str, cycles)
            console.print(f"       [red][BLOQUEADO] Circuit Breaker (El Juez): Tarea {task_id_str} bloqueada por superar {max_debate_cycles} ciclos sin consenso.[/red]")
            event_bus.publish(EventType.CIRCUIT_BREAKER_TRIPPED, {
                "task_id": task_id_str,
                "cycles": cycles,
                "reason": f"Maximos ciclos de debate ({max_debate_cycles}) alcanzados sin consenso."
            })
            event_bus.publish(EventType.TASK_BLOCKED, {"task_id": task_id_str, "reason": reason})
            self.orchestrator.state.blackboard.set(f"task_status_{task_id_str}", "blocked")
            if task is not None and tasks is not None:
                task["status"] = "BLOCKED"
                task["state"] = "BLOCKED"
                self.orchestrator._save_board(tasks)
            return False, f"El Juez intervino: {reason}", True
            
        event_bus.publish(EventType.CODE_REJECTED, {"task_id": task_id_str, "reviewer": "qa_engineer", "cycle": cycles})
        event_bus.publish(EventType.DEBATE_CYCLE_STARTED, {"task_id": task_id_str, "cycle": cycles + 1})
        console.print(f"       [yellow][MENSAJE] [@qa_engineer rechazo (Ciclo {cycles}/{max_debate_cycles})]: {reason[:100]}...[/yellow]")
        return False, f"[DEBATE ENJAMBRE - CRITICA DE @qa_engineer (Ciclo {cycles}/{max_debate_cycles})]:\n{reason}", False

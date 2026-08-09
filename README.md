# 🪼 Jellyfish OS v6.9.16 — Manual Completo del Usuario y Desarrollador

Bienvenido a la documentación oficial de **Jellyfish OS v6.9.16**, un sistema operativo de agentes cognitivos corporativos, arquitectura multi-agencia de enjambre (*Swarm Architecture*) y framework de orquestación ágil/secuencial diseñado para ejecutarse de forma nativa en sistemas Linux.

Jellyfish combina la potencia de múltiples modelos de lenguaje a gran escala (LLMs a través de Ollama, Google Gemini 3.x, OpenAI, Claude, Groq, DeepSeek y OpenRouter) con una robusta suite de herramientas de sistema, persistencia vectorial para RAG inteligente y un **Director de Orquesta (CEO / Agency Orchestrator)** autónomo con capacidades de enrutamiento heterogéneo y reparación determinística (*Auto-Healing*).

---

## 🗺️ 1. Arquitectura y Estructura del Core (Enjambre Multi-Agencia)

Jellyfish v6.9.16 evoluciona la arquitectura multi-agencia mediante la integración de **Enjambres Especializados (Swarm Architecture)** y enrutamiento heterogéneo inteligente. Los agentes se agrupan en agencias departamentales delimitadas por tableros independientes, evitando la contaminación de contextos.

### Diagrama de Arquitectura y Flujo del Enjambre (Swarm)

```mermaid
graph TD
    User([Usuario / Developer]) --> CLI[jellyfish.py / TUI & Autocompletado]
    CLI <--> State[core.state / JellyfishState & Blackboard]
    CLI --> Commands[core.commands / Slash Commands]
    
    Commands --> Config[Configuración & SwarmRouter]
    Config -.-> RAG[core.rag_coder / RAG Vector DB (Auto-OFF/ON)]

    Commands --> AutoCEO[core.agency_orchestrator / CEO: /auto & Mega Planner]
    Commands --> Run[core.terminal / Terminal Seguro]
    Commands --> PluginSys[plugins/plugin_core.py / Sandbox Bubblewrap]

    AutoCEO --> SwarmRouter{Enrutador Heterogéneo SwarmRouter}
    SwarmRouter -->|QA / Crítica / Seguridad| Groq[Modelos Baja Latencia: Groq / QA]
    SwarmRouter -->|Código / Plan / Arquitectura| Gemini[Modelos Gran Contexto: Gemini / OpenAI / Ollama]

    AutoCEO --> AgencyDev[Agencia: Desarrollo & Ingeniería]
    AutoCEO --> AgencyMkt[Agencia: Marketing & Estrategia]
    AutoCEO --> AgencyRes[Agencia: Investigación RAG]

    AgencyDev --> PO_Scan[1. Product Owner: US-000 Sprint 0 Infraestructura]
    PO_Scan --> SM_Plan[2. Scrum Master & Mega Planner: SPRINT_BOARD.md]
    SM_Plan --> Task_Run[3. Task Runner con Python Static DoD Check]
    Task_Run <--> Run
    Task_Run --> AutoHeal[4. BuildHealer: Auto-Healing & Patch/Diff Determinístico]
    AutoHeal --> Daily_Close[5. Sprint Close & Auditoría de Consenso] --> CLI
```

### Componentes Clave del Core v6.9.16

1. **`core/agents/base.py` & Plantillas Jinja2 (Profesionales en T)**:
   Los agentes ya no se definen concatenando *strings* gigantescos. Todo agente carga dinámicamente su personalidad desde plantillas `Jinja2` (`templates/agent_prompt.j2`). Además, implementan el método `matches_task()`, una evaluación matemática basada en `expertise` y `directives` que permite asignar tareas programáticamente (ahorrando tokens del LLM) a agentes con perfiles "en forma de T" (profundo conocimiento técnico, amplia adaptabilidad).
2. **`core/orchestration/code_analyzer.py` & `task_runner.py` (DoD Determinístico)**:
   Se ha reemplazado la costosa "Directiva Anti-Archivos Huérfanos" (basada en prompts que rogaban al LLM no crear archivos aislados) por la función `check_orphaned_files()`. Esta validación matemática en Python escanea el AST del proyecto y rechaza cualquier sub-tarea donde el nuevo archivo no esté siendo importado por el punto de entrada principal (ej. `main.py` o `App.tsx`).
3. **`core/llm_engine.py` (Tolerancia a Fallos y GPU)**:
   El motor HTTP subyacente maneja reconexiones asíncronas y un timeout extendido (900 segundos) para prevenir bloqueos prematuros (`TimeoutException`) cuando Ollama o GPUs locales sufren de sobrecarga (OOM) o encolado de procesos.
4. **`core/project_orchestrator.py` (Auto-Bootstrap del Blackboard)**:
   Para evitar errores silenciosos o spam en consola (v6.9.15), la "Fase 0" de inicialización genera automáticamente esqueletos vacíos para la inteligencia del proyecto (`DESIGN_TOKENS.md`, `DATA_SCHEMA.md`, `COMPONENT_INDEX.md`) garantizando una memoria sólida a la cual los agentes pueden suscribirse para anotar sus decisiones.

---

## 🚀 2. Instalación y Configuración Inicial

### Requisitos del Sistema
- **Sistema Operativo**: Linux (Debian/Ubuntu/Fedora/Arch recomendado).
- **Python**: Versión `3.10` o superior.
- **Bubblewrap**: Opcional, recomendado para el aislamiento seguro (*sandbox*).
- **Ollama**: Servidor local para modelos offline.

### Instalación de Dependencias e Inicialización v6.9.16
```bash
pip install -r requirements.txt
python setup.py --setup
```

---

## 🧠 3. Habilidades (Skills), Plugins y Motor RAG Inteligente

En Jellyfish OS v6.9.16 se define una separación conceptual estricta:
- **Skills (Cognición - `.md` o `.py`)**: Patrones inyectados al prompt de los agentes.
- **Plugins (Acción - `.py`)**: Llamadas y utilidades automatizadas seguras.
- **RAG Vectorial**: Empaquetado bajo ChromaDB. Se activa exclusivamente vía comando `/add` para no saturar memoria RAM por defecto.

---

## 💡 4. Seguridad, Aislamiento y Auto-Healing

### 🛡️ A. Sprint 0 de Infraestructura & Entornos Virtuales
Al iniciar `/project`, Jellyfish crea y activa automáticamente un entorno virtual local (`.venv`), protegiendo de dependencias cruzadas al sistema host.

### 🧪 B. Validación Estricta Anti-Huérfanos y Subprocesos
La validación ahora es un modelo híbrido: 
1) Chequeo estático `check_orphaned_files`.
2) Verificación sintáctica `validate_syntax`.
3) Ejecución interactiva del `BuildHealer` en subprocesos.

### ⚖️ C. El Juez & Debates de Consenso en el Enjambre
Durante la ejecución de tareas, los agentes constructores y auditores debaten. Si no logran consenso de calidad tras `MAX_DEBATE_CYCLES` (3 ciclos), interviene **El Juez (Circuit Breaker)**, marcando la tarea como bloqueada para salvaguardar la integridad de la base de código.

---

## 📋 5. Guía Completa de Comandos v6.9.16

| Comando | Sintaxis | Descripción |
| :--- | :--- | :--- |
| `/model` | `/m` o `/model` | Selector interactivo TUI para configurar enrutamiento. |
| `/config` | `/config <subcomando>` | Panel interactivo para gestionar variables y API keys. |
| `/auto` | `/auto <descripción>` | Activa el CEO y el Mega Planner, iniciando el desarrollo ágil. |
| `/research` | `/research <consulta>` | Investigación de 4 fases para documentar código con RAG. |
| `/agent` | `/agent` o `@<nombre>` | Cambia el rol activo (ej. `@developer`, `@qa_engineer`). |
| `/project` | `/project <ruta>` | Carga un proyecto de software y orquesta la Inteligencia de Proyecto (Fase 0). |
| `/compile` | `/compile` | Ejecuta la verificación de build con supervisión del BuildHealer. |
| `/errors` | `/errors` | Monitor de excepciones TUI y diagnóstico de crash bugs. |

---

## ⚠️ 6. Auditoría Técnica y Deuda (Technical Debt) [NUEVO EN v6.9.16]

Como parte de la evolución hacia sistemas más estables, se ha completado una auditoría técnica profunda de la versión 6.9.16. Si bien las características actuales de Swarm y RAG son excepcionales, se identifican las siguientes áreas críticas de mejora (Roadmap) para la comunidad y desarrolladores:

### 🔴 Cuellos de Botella (Limitaciones Actuales)

1. **Arquitectura de Monolitos de Código (Anti-patrón)**:
   - Archivos clave como `core/orchestration/task_runner.py` (~1200+ líneas) y `core/project_orchestrator.py` (~1600+ líneas) concentran excesiva responsabilidad (violación de S.O.L.I.D).
   - **Riesgo:** Un simple cambio en la UI (Rich) de la terminal puede romper la lógica del `BuildHealer` o el ciclo de micro-tareas.
   - **Solución Propuesta:** Fragmentar el runner de tareas en submódulos de estado (`State_Machine`), UI (`Console_Renderer`) y validación (`Validator`).

2. **Extracción de Código Frágil (RegEx vs Structured Output)**:
   - Actualmente, Jellyfish depende de expresiones regulares (`re.search(r'```...`) en el Fallback para extraer código del LLM. 
   - **Riesgo:** Si el LLM genera múltiples archivos sin etiquetas XML correctas, o alucina formatos, la expresión regular fallará y corromperá el guardado de archivos.
   - **Solución Propuesta:** Adoptar obligatoriamente **Structured Outputs** (JSON Schema, Pydantic, librería `Instructor`) para que los LLM devuelvan cargas útiles determinísticas garantizadas.

3. **Sobrecarga de Contexto Lineal (Memory Bloat)**:
   - La función `_build_accumulated_context()` inyecta físicamente en el prompt TODO el código de los archivos generados en iteraciones previas del sprint.
   - **Riesgo:** Para proyectos que superen los 10 archivos, esto provocará rápidamente un Error por Sobrepaso de Ventana de Contexto (OOM / Timeout) en modelos locales, encareciendo masivamente la ejecución en modelos de nube.
   - **Solución Propuesta:** Implementar *Vectorial Context Caching* utilizando el motor RAG ya presente en ChromaDB, limitando la recuperación de código solo a las clases estrictamente necesarias para la micro-tarea actual.

4. **Validación Insegura de Contenedores en Host**:
   - Ejecutar `docker compose build` o compiladores de C++ directamente mediante `subprocess.run` en la máquina local (host) expone al sistema a fallos drásticos si el agente "alucina" un flag destructivo.
   - **Solución Propuesta:** Enjaular todas las validaciones del `Definition of Done (DoD)` en un contenedor efímero aislado (usando una API de contenedores o perfiles severos de *Bubblewrap* restrictivo).

---

*Última actualización de especificación técnica: 2026-08-09 — Versión de Auditoría: 6.9.16*

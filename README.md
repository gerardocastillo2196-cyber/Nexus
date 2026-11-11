# Nexus OS v7.0 — Manual Completo del Usuario y Desarrollador

Bienvenido a la documentación oficial de **Nexus OS v7.0**, un entorno cognitivo de desarrollo asistido, arquitectura de agentes y framework modular diseñado para ejecutarse de forma nativa en sistemas Linux.

Nexus OS combina la potencia de múltiples modelos de lenguaje a gran escala (LLMs a través de Ollama, Google Gemini, OpenAI, Claude, Groq, DeepSeek y OpenRouter) con una suite de herramientas de sistema, persistencia vectorial RAG y una Tienda de Herramientas Modulares que incluye la herramienta de metodología ágil **Jellyfish** y la herramienta de inteligencia narrativa **ESCRIBA**.

---

## 1. Arquitectura y Estructura del Core (Nexus OS v7.0)

Nexus OS v7.0 evoluciona la arquitectura multi-agencia mediante la integración de **Enjambres Especializados** y enrutamiento heterogéneo inteligente. Los agentes se agrupan en agencias departamentales delimitadas por tableros independientes, evitando la contaminación de contextos.

### Diagrama de Arquitectura y Flujo del Enjambre

```mermaid
graph TD
    User([Usuario / Developer]) --> GUI[Nexus Web Interface v7.0]
    GUI <--> State[core.state / SystemState & Blackboard]
    GUI --> Commands[core.commands / Slash Commands]
    
    Commands --> Config[Configuración & SwarmRouter]
    Config -.-> RAG[core.rag_coder / RAG Vector DB]

    Commands --> AutoCEO[core.agency_orchestrator / Director de Orquesta]
    Commands --> Run[core.terminal / Terminal Seguro]

    AutoCEO --> SwarmRouter{Enrutador Heterogéneo SwarmRouter}
    SwarmRouter -->|QA / Crítica / Seguridad| Groq[Modelos Baja Latencia: Groq / QA]
    SwarmRouter -->|Código / Plan / Arquitectura| Gemini[Modelos Gran Contexto: Gemini / OpenAI / Ollama]

    AutoCEO --> AgencyDev[Agencia: Desarrollo & Ingeniería (Jellyfish)]
    AutoCEO --> AgencyRes[Agencia: Investigación RAG]

    AgencyDev --> PO_Scan[1. Product Owner: US-000 Sprint 0]
    PO_Scan --> SM_Plan[2. Scrum Master & Mega Planner: SPRINT_BOARD.md]
    SM_Plan --> Task_Run[3. Task Runner]
    Task_Run <--> Run
    Task_Run --> AutoHeal[4. Auto-Healing & Patch Determinístico]
```

### Componentes Clave del Core v7.0

1. **`core/agents/base.py` & Plantillas Jinja2**:
   Los agentes cargan dinámicamente sus personalidades desde plantillas `Jinja2` (`templates/agent_prompt.j2`). Además, implementan el método `matches_task()`, una evaluación basada en `expertise` y `directives` que permite asignar tareas programáticamente.
2. **`core/orchestration/code_analyzer.py` & `task_runner.py`**:
   Validaciones en Python escanean el AST del proyecto y verifican dependencias e importaciones.
3. **`core/llm_engine.py`**:
   Conexión resiliente a proveedores locales (Ollama) y remotos (Gemini, OpenAI, Anthropic, OpenRouter) con retry con backoff exponencial.

---

## 2. Tienda de Herramientas Modulares

Nexus OS v7.0 introduce la arquitectura modular de herramientas, activables de forma independiente desde la Tienda de Herramientas Nexus:

1. **Jellyfish (Agencia Ágil & Desarrollo)**:
   - Orquestación ágil de proyectos de software.
   - Roles especializados (@product_owner, @scrum_master, @developer).
   - Generación y seguimiento de artefactos (`BACKLOG.md`, `SPRINT_BOARD.md`, `DAILY.md`).
   - Tablero Kanban/Scrum interactivo e integrado en la interfaz gráfica.

2. **ESCRIBA (Inteligencia Narrativa & Worldbuilding)**:
   - Extracción automática de grafos semánticos (personajes, lugares, facciones).
   - Canva de Escritura interactivo con sincronización en vivo.
   - Simulador What-If de efecto dominó.
   - Debate multi-modelo (Ensamble).

3. **Chat Conversacional Libre (Sin Herramientas Activas)**:
   - Cuando ni Jellyfish ni ESCRIBA están activados, Nexus OS opera como un chat conversacional puro, sin mostrar elementos, insignias ni opciones de las herramientas en la interfaz.

---

## 3. Instalación y Ejecución

### Prerrequisitos
- Linux (Ubuntu/Debian/Fedora/Arch/Manjaro)
- Python 3.10+
- Node.js 18+ y npm

### Iniciar el Servidor Web (Nexus OS v7.0)

```bash
# Iniciar backend FastAPI (Nexus + ESCRIBA + Jellyfish)
python3 jellyfish_web.py
# O directamente:
python3 nexus/nexus.py

# El servidor estará disponible en http://localhost:8001
```

### Desarrollo de la Interfaz Web (Vite + React)

```bash
# Desde la raíz del repositorio:
npm run dev     # Servidor de desarrollo
npm run build   # Compilar bundle de producción

# O ingresando al subdirectorio:
cd nexus/web-ui
npm run dev
npm run build
```

### Administración y Diagnóstico

```bash
python3 manage.py --status   # Auditar estado del sistema y configuración de proveedores
python3 manage.py --setup    # Inicializar directorios de trabajo y sincronizar agentes
```


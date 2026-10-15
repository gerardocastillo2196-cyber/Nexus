"""core/api/router.py — APIRouter principal que combina los subrouters del ecosistema Nexus OS."""

import os
from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from core.api.chat import router as chat_router
from core.api.escriba import router as escriba_router
from core.api.rag import router as rag_router
from core.api.project import router as project_router
from core.api.config import router as config_router
from core.api.deps import get_state

router = APIRouter()

# Registrar subrouters por responsabilidad
router.include_router(chat_router)
router.include_router(escriba_router)
router.include_router(rag_router)
router.include_router(project_router)
router.include_router(config_router)


# Modelos DTO de Respuesta (Interface Segregation Principle & Type Safety)
class AgentItem(BaseModel):
    name: str
    role: str


class AgencyItem(BaseModel):
    id: str
    name: str
    agents: List[AgentItem]


class AgenciesResponse(BaseModel):
    agencies: List[AgencyItem]


class SystemStateResponse(BaseModel):
    active_agent: str
    active_agency: str
    provider: str
    model: str
    active_project: Optional[str] = ""
    active_project_name: Optional[str] = "Sin proyecto"
    scrum_active: bool
    escriba_active: bool
    auto_approve: bool
    theme: str
    liquid_glass_enabled: bool


@router.get("/agencies", response_model=AgenciesResponse)
async def get_agencies():
    """Retorna el catálogo unificado de agencias y agentes del ecosistema Nexus."""
    return AgenciesResponse(
        agencies=[
            AgencyItem(
                id="escriba",
                name="Agencia de Marco Teórico & Arquitectura Narrativa",
                agents=[
                    AgentItem(name="arquitecto_narrativo", role="Arquitecto Narrativo & Estratega de Worldbuilding"),
                    AgentItem(name="historico", role="Investigador Histórico & Contexto de Época"),
                    AgentItem(name="filosofo", role="Filosofía, Marco Teórico & Dilemas Éticos"),
                    AgentItem(name="politico_geopolitico", role="Geopolítica, Sistemas de Poder & Guerra"),
                    AgentItem(name="teologo_mitologico", role="Cosmovisiones, Teología & Mitología"),
                    AgentItem(name="simulador_personajes", role="Simulación de Personajes & Debates"),
                    AgentItem(name="editor_literario", role="Edición Estilística, Prosa & Tono"),
                    AgentItem(name="oraculo_escritor", role="Lluvia de Ideas & Giro de Trama")
                ]
            ),
            AgencyItem(
                id="development",
                name="Agencia Ágil de Desarrollo",
                agents=[
                    AgentItem(name="product_owner", role="Definición de Requerimientos y Backlog"),
                    AgentItem(name="scrum_master", role="Facilitador Ágil & Planificación"),
                    AgentItem(name="architect_software", role="Diseño de Arquitectura y Patrones"),
                    AgentItem(name="developer", role="Implementación de Código y Lógica"),
                    AgentItem(name="qa_tester", role="Verificación y Pruebas Unitarias"),
                    AgentItem(name="code_reviewer", role="Revisión de Calidad y Refactorización")
                ]
            ),
            AgencyItem(
                id="research",
                name="Agencia de Investigación y RAG",
                agents=[
                    AgentItem(name="researcher", role="Análisis de Datos e Investigación"),
                    AgentItem(name="rag_specialist", role="Indexación y Búsqueda Vectorial")
                ]
            ),
            AgencyItem(
                id="management",
                name="Agencia de Dirección y Coordinación",
                agents=[
                    AgentItem(name="sentinel", role="Supervisión y Control de Flujo"),
                    AgentItem(name="coordinator", role="Sincronización de Equipos")
                ]
            )
        ]
    )


@router.get("/state", response_model=SystemStateResponse)
async def get_system_state():
    """Retorna el estado global en tiempo real de Nexus OS."""
    state = get_state()
    scrum_active = getattr(state, "scrum_active", False)
    active_agent = state.active_agent if scrum_active else "default"
    active_agency = state.active_agency if scrum_active else "default"
    escriba_active = getattr(state, "escriba_active", False)
    current_theme = getattr(state, "theme", "liquid_glass" if escriba_active else "default")

    active_proj_val = state.active_project or ""
    active_proj_name = "Sin proyecto"

    if escriba_active:
        from core.escriba_engine import load_escriba_projects, get_active_project_id, save_escriba_projects
        projs = load_escriba_projects()
        target_pid = active_proj_val or get_active_project_id()

        if not target_pid and projs:
            target_pid = str(projs[0].get("id"))
            projs[0]["active"] = True
            save_escriba_projects(projs)

        if target_pid:
            state.active_project = target_pid
            active_proj_val = target_pid
            match_p = next((p for p in projs if str(p.get("id")) == str(target_pid)), None)
            if match_p:
                active_proj_name = match_p.get("title") or match_p.get("name") or target_pid
            else:
                active_proj_name = target_pid
    elif active_proj_val:
        active_proj_name = os.path.basename(active_proj_val)

    return SystemStateResponse(
        active_agent=active_agent,
        active_agency=active_agency,
        provider=state.provider,
        model=state.model,
        active_project=active_proj_val,
        active_project_name=active_proj_name,
        scrum_active=scrum_active,
        escriba_active=escriba_active,
        auto_approve=getattr(state, "auto_approve", False),
        theme=current_theme,
        liquid_glass_enabled=(current_theme == "liquid_glass")
    )

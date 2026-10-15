"""core/api/project.py — Endpoints de gestión de proyectos y Scrum para la API Web de Jellyfish."""

import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.api.deps import get_state

router = APIRouter(prefix="/projects")
logger = logging.getLogger("jellyfish.api.project")


class SwitchProjectRequest(BaseModel):
    project_path: str


class CreateProjectRequest(BaseModel):
    idea: str
    auto_approve: Optional[bool] = False


class AutoApproveRequest(BaseModel):
    auto_approve: bool


@router.get("/")
async def get_projects():
    """Retorna la lista de proyectos disponibles y el activo."""
    state = get_state()
    projects_dir = os.path.join(os.path.dirname(state.active_project or "."), "projects")
    if not os.path.exists(projects_dir):
        projects_dir = os.path.join(os.getcwd(), "projects")

    available_projects = []
    if os.path.exists(projects_dir):
        try:
            available_projects = [
                d for d in os.listdir(projects_dir)
                if os.path.isdir(os.path.join(projects_dir, d)) and not d.startswith(".")
            ]
        except Exception:
            pass

    return {
        "active_project": state.active_project,
        "active_project_name": os.path.basename(state.active_project) if state.active_project else "Sin proyecto",
        "available_projects": sorted(available_projects)
    }


@router.post("/switch")
async def switch_project(req: SwitchProjectRequest):
    """Cambia el proyecto activo de Jellyfish."""
    state = get_state()
    path = req.project_path.strip()

    if path.lower() in ("none", "", "sin proyecto"):
        state.active_project = ""
        return {"status": "ok", "active_project": "", "message": "Proyecto desvinculado."}

    if not os.path.isabs(path):
        projects_dir = os.path.join(os.getcwd(), "projects")
        full_path = os.path.join(projects_dir, path)
        if os.path.exists(full_path):
            path = full_path

    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"El directorio '{path}' no existe.")

    state.active_project = os.path.abspath(path)
    state.refresh_static_context()

    return {
        "status": "ok",
        "active_project": state.active_project,
        "active_project_name": os.path.basename(state.active_project)
    }


@router.post("/unlink")
async def unlink_project():
    """Desvincula el proyecto activo actual."""
    state = get_state()
    state.active_project = ""
    state.refresh_static_context()
    return {"status": "ok", "message": "Proyecto desvinculado."}


@router.post("/auto_approve")
async def set_auto_approve(req: AutoApproveRequest):
    """Configura el modo de auto-aprobación para la generación de código."""
    state = get_state()
    state.auto_approve = req.auto_approve
    return {"status": "ok", "auto_approve": state.auto_approve}

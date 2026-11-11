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

    abs_path = os.path.abspath(path)
    if not os.path.isdir(abs_path):
        raise HTTPException(status_code=400, detail="La ruta especificada debe ser un directorio válido.")

    # Hardening Blue Team: Prohibir vinculación de directorios críticos del sistema
    forbidden_roots = {"/", "/etc", "/sys", "/proc", "/dev", "/boot", "/root", "/bin", "/sbin", "/usr", "/var"}
    if abs_path in forbidden_roots or any(abs_path.startswith(f + "/") for f in ["/etc", "/sys", "/proc", "/dev", "/boot", "/root"]):
        logger.warning("[SEGURIDAD] INTENTO DE PATH TRAVERSAL BLOQUEADO: Intento de vincular directorio de sistema '%s'", abs_path)
        raise HTTPException(
            status_code=400,
            detail="Acceso denegado: Por seguridad, no se permite vincular directorios críticos del sistema como proyecto."
        )

    state.active_project = abs_path
    state.refresh_static_context()
    logger.info("Proyecto activo cambiado a: %s", abs_path)

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
    logger.warning("[CONFIG] MODO AUTO-APROBACIÓN MODIFICADO: auto_approve=%s", req.auto_approve)
    return {"status": "ok", "auto_approve": state.auto_approve}

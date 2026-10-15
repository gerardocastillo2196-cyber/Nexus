"""core/api/config.py — Endpoints de configuración, modelo y habilidades para la API Web de Jellyfish."""

import os
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.api.deps import get_state

router = APIRouter()
logger = logging.getLogger("jellyfish.api.config")


class ConfigUpdateRequest(BaseModel):
    provider: Optional[str] = None
    model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    api_key: Optional[str] = None
    theme: Optional[str] = None
    liquid_glass_enabled: Optional[bool] = None


class SkillsToggleRequest(BaseModel):
    skill_path: str
    enabled: bool


class ToolToggleRequest(BaseModel):
    tool_name: str
    enabled: bool


class ContextFileRequest(BaseModel):
    filepath: str


@router.get("/config")
async def get_config():
    """Retorna la configuración actual del modelo, proveedor, tema visual y contexto."""
    state = get_state()
    from core.config import PROVIDER_CONFIGS, supported_provider_names
    current_theme = getattr(state, "theme", "liquid_glass" if getattr(state, "escriba_active", False) else "default")
    return {
        "provider": state.provider,
        "model": state.model,
        "ollama_base_url": state.ollama_base_url,
        "available_providers": supported_provider_names(),
        "provider_configs": PROVIDER_CONFIGS,
        "active_skills": list(state.active_skills),
        "context_files": list(state.context_files),
        "scrum_active": getattr(state, "scrum_active", False),
        "escriba_active": getattr(state, "escriba_active", False),
        "theme": current_theme,
        "liquid_glass_enabled": current_theme == "liquid_glass"
    }


@router.post("/config")
async def update_config(req: ConfigUpdateRequest):
    """Actualiza la configuración del proveedor, modelo, tema visual o API keys de Nexus."""
    state = get_state()
    from core.config import normalize_provider, PROVIDER_CONFIGS, save_config_to_env

    if req.provider:
        norm_p = normalize_provider(req.provider)
        if not norm_p:
            raise HTTPException(status_code=400, detail=f"Proveedor '{req.provider}' no soportado.")
        state.provider = norm_p
        if norm_p in PROVIDER_CONFIGS and "default_model" in PROVIDER_CONFIGS[norm_p]:
            state.model = PROVIDER_CONFIGS[norm_p]["default_model"]

    if req.model:
        state.model = req.model

    if req.ollama_base_url:
        state.ollama_base_url = req.ollama_base_url

    if req.theme:
        if req.theme not in ["default", "liquid_glass"]:
            raise HTTPException(status_code=400, detail="Tema no soportado. Los temas disponibles son 'default' y 'liquid_glass'")
        state.theme = req.theme
        save_config_to_env(state, theme=req.theme)

    if req.liquid_glass_enabled is not None:
        new_theme = "liquid_glass" if req.liquid_glass_enabled else "default"
        state.theme = new_theme
        save_config_to_env(state, theme=new_theme)

    if req.api_key and req.provider:
        env_key_map = {
            "openai": "OPENAI_API_KEY",
            "gemini": "GEMINI_API_KEY",
            "deepseek": "DEEPSEEK_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "dashscope": "DASHSCOPE_API_KEY",
            "kimi": "KIMI_API_KEY",
            "zhipu": "ZHIPU_API_KEY",
        }
        target_env = env_key_map.get(state.provider)
        if target_env:
            os.environ[target_env] = req.api_key.strip()
            setattr(state, target_env.lower(), req.api_key.strip())

    state.refresh_static_context()

    return {
        "status": "ok",
        "provider": state.provider,
        "model": state.model,
        "ollama_base_url": state.ollama_base_url
    }


@router.get("/skills")
async def get_skills():
    """Retorna la lista de todas las habilidades instaladas y su estado activo."""
    state = get_state()
    from core.skills.registry import SkillRegistry
    skills_data = []

    try:
        from core.state import AGENCY_DIR
        skills_dir = os.path.join(AGENCY_DIR, "skills")
        if os.path.exists(skills_dir):
            for root, _, files in os.walk(skills_dir):
                for f in sorted(files):
                    if f.endswith(".md") or f.endswith(".py"):
                        full_path = os.path.join(root, f)
                        rel_path = os.path.relpath(full_path, skills_dir)
                        skills_data.append({
                            "name": rel_path,
                            "path": full_path,
                            "active": full_path in state.active_skills
                        })
    except Exception as e:
        logger.warning("Error al listar habilidades: %s", e)

    return {"skills": skills_data}


@router.post("/skills/toggle")
async def toggle_skill(req: SkillsToggleRequest):
    """Activa o desactiva una habilidad específica."""
    state = get_state()
    path = req.skill_path

    if req.enabled:
        if path not in state.active_skills:
            state.active_skills.add(path)
    else:
        if path in state.active_skills:
            state.active_skills.remove(path)

    state.refresh_static_context()
    return {"status": "ok", "skill": path, "enabled": req.enabled}


@router.post("/tools/toggle")
async def toggle_tool(req: ToolToggleRequest):
    """Activa o desactiva una herramienta o módulo nativo (escriba, scrum, etc.)."""
    state = get_state()
    tool_name = req.tool_name.lower().strip()

    if tool_name == "escriba":
        state.escriba_active = bool(req.enabled)
        if req.enabled:
            state.scrum_active = False
    elif tool_name in ["scrum", "agencia", "jellyfish"]:
        state.scrum_active = bool(req.enabled)
        if req.enabled:
            state.escriba_active = False
        if not req.enabled:
            state.active_agent = "default"
            state.active_agency = "default"
    else:
        setattr(state, f"{tool_name}_active", bool(req.enabled))

    from core.config import save_config_to_env
    try:
        save_config_to_env(state, escriba_active="1" if state.escriba_active else "0", scrum_active="1" if state.scrum_active else "0")
    except Exception as e:
        logger.warning("Error guardando toggle de herramienta en .env: %s", e)

    return {
        "status": "ok",
        "tool_name": tool_name,
        "enabled": req.enabled,
        "escriba_active": getattr(state, "escriba_active", False),
        "scrum_active": getattr(state, "scrum_active", False)
    }


@router.post("/context/file")
async def add_context_file(req: ContextFileRequest):
    """Agrega un archivo al contexto estático del LLM."""
    state = get_state()
    if not os.path.isfile(req.filepath):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    state.context_files.add(req.filepath)
    state.refresh_static_context()
    return {"status": "ok", "added": req.filepath, "total_files": len(state.context_files)}


@router.delete("/context/file")
async def remove_context_file(req: ContextFileRequest):
    """Remueve un archivo del contexto estático del LLM."""
    state = get_state()
    if req.filepath in state.context_files:
        state.context_files.remove(req.filepath)
        state.refresh_static_context()

    return {"status": "ok", "removed": req.filepath, "total_files": len(state.context_files)}

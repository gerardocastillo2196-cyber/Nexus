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
    skill_path: Optional[str] = None
    skill_id: Optional[str] = None
    skill_name: Optional[str] = None
    enabled: bool


class ToolToggleRequest(BaseModel):
    tool_name: str
    enabled: bool


class ContextFileRequest(BaseModel):
    filepath: str


@router.get("/config")
async def get_config():
    """Retorna la configuración actual del modelo, proveedor, tema visual, contexto y habilidades."""
    state = get_state()
    from core.config import PROVIDER_CONFIGS, supported_provider_names
    from core.skills.registry import SkillRegistry
    from core.state import AGENCY_DIR

    skills_dir = os.path.join(AGENCY_DIR, "skills")
    if not SkillRegistry._scanned:
        SkillRegistry.scan(skills_dir)

    available_skills = []
    for name, skill_cls in SkillRegistry.list_skills().items():
        try:
            info = SkillRegistry.get_skill_info(skill_cls)
            filepath = info["filepath"]
            skill_id = info["id"]
            slug = info["slug"]
            is_active = (
                filepath in state.active_skills
                or skill_id in state.active_skills
                or slug in state.active_skills
                or info["name"].lower() in [s.lower() for s in state.active_skills]
            )
            available_skills.append({
                "name": info["name"],
                "skill_id": skill_id,
                "slug": slug,
                "agency": info["agency"],
                "ecosystem": info.get("ecosystem", "nexus"),
                "role": info["role"],
                "description": info["description"],
                "keywords": info["keywords"],
                "has_execution": info["has_execution"],
                "enabled": is_active,
                "path": filepath
            })
        except Exception:
            pass

    current_theme = getattr(state, "theme", "liquid_glass" if getattr(state, "escriba_active", False) else "default")
    return {
        "provider": state.provider,
        "model": state.model,
        "ollama_base_url": state.ollama_base_url,
        "available_providers": supported_provider_names(),
        "provider_configs": PROVIDER_CONFIGS,
        "available_skills": available_skills,
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
    """Retorna la lista de todas las habilidades registradas con metadatos estructurados."""
    state = get_state()
    from core.skills.registry import SkillRegistry
    from core.state import AGENCY_DIR

    skills_dir = os.path.join(AGENCY_DIR, "skills")
    if not SkillRegistry._scanned:
        SkillRegistry.scan(skills_dir)

    skills_data = []
    canonical = SkillRegistry.list_skills()

    for name, skill_cls in canonical.items():
        try:
            info = SkillRegistry.get_skill_info(skill_cls)
            filepath = info["filepath"]
            skill_id = info["id"]
            slug = info["slug"]

            is_active = (
                filepath in state.active_skills
                or skill_id in state.active_skills
                or slug in state.active_skills
                or info["name"].lower() in [s.lower() for s in state.active_skills]
            )

            rel_path = os.path.relpath(filepath, skills_dir) if filepath and os.path.exists(filepath) else f"{info['agency'].lower()}/{slug}.py"

            skills_data.append({
                "id": skill_id,
                "slug": slug,
                "name": info["name"],
                "agency": info["agency"],
                "role": info["role"],
                "keywords": info["keywords"],
                "description": info["description"],
                "has_execution": info["has_execution"],
                "path": filepath or rel_path,
                "rel_path": rel_path,
                "active": is_active
            })
        except Exception as err:
            logger.warning("Error serializando skill %s: %s", name, err)

    return {"skills": skills_data, "total": len(skills_data)}


@router.get("/skills/catalog")
async def get_skills_catalog():
    """Retorna el catálogo completo de habilidades organizado por agencia con estadísticas."""
    state = get_state()
    from core.skills.registry import SkillRegistry
    from core.state import AGENCY_DIR
    from collections import defaultdict

    skills_dir = os.path.join(AGENCY_DIR, "skills")
    if not SkillRegistry._scanned:
        SkillRegistry.scan(skills_dir)

    canonical = SkillRegistry.list_skills()
    agencies_dict = defaultdict(list)
    all_skills = []

    for name, skill_cls in canonical.items():
        try:
            info = SkillRegistry.get_skill_info(skill_cls)
            filepath = info["filepath"]
            skill_id = info["id"]
            slug = info["slug"]

            is_active = (
                filepath in state.active_skills
                or skill_id in state.active_skills
                or slug in state.active_skills
                or info["name"].lower() in [s.lower() for s in state.active_skills]
            )

            skill_item = {
                "id": skill_id,
                "slug": slug,
                "name": info["name"],
                "agency": info["agency"],
                "ecosystem": info.get("ecosystem", "nexus"),
                "role": info["role"],
                "keywords": info["keywords"],
                "description": info["description"],
                "has_execution": info["has_execution"],
                "path": filepath,
                "active": is_active
            }
            agencies_dict[info["agency"]].append(skill_item)
            all_skills.append(skill_item)
        except Exception as err:
            logger.warning("Error en catálogo para skill %s: %s", name, err)

    sorted_agencies = sorted(agencies_dict.keys())
    return {
        "status": "ok",
        "total_skills": len(all_skills),
        "agencies": sorted_agencies,
        "skills_by_agency": {ag: agencies_dict[ag] for ag in sorted_agencies},
        "skills": all_skills
    }


@router.get("/skills/detail/{skill_id:path}")
async def get_skill_detail(skill_id: str):
    """Retorna los detalles completos y las instrucciones de una habilidad específica."""
    from core.skills.registry import SkillRegistry
    inst = SkillRegistry.get(skill_id)
    if not inst:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' no encontrada en el registro.")

    info = SkillRegistry.get_skill_info(inst)
    instructions = ""
    try:
        instructions = inst.get_instructions()
    except Exception as e:
        instructions = f"Error al generar instrucciones: {e}"

    return {
        "status": "ok",
        **info,
        "instructions": instructions
    }


@router.post("/skills/toggle")
async def toggle_skill(req: SkillsToggleRequest):
    """Activa o desactiva una habilidad específica de forma normalizada."""
    state = get_state()
    from core.skills.registry import SkillRegistry

    target_key = req.skill_id or req.skill_name or req.skill_path or ""
    if not target_key:
        raise HTTPException(status_code=400, detail="Debe proveer skill_id, skill_name o skill_path.")

    inst = SkillRegistry.get(target_key)
    canonical_id = f"{inst.agency.lower()}:{inst._slug}" if inst and hasattr(inst, "_slug") else target_key
    filepath = getattr(inst, "_filepath", "") if inst else req.skill_path

    if req.enabled:
        state.active_skills.add(canonical_id)
        if filepath:
            state.active_skills.add(filepath)
    else:
        # Remover todas las variantes para evitar estados zombies
        state.active_skills.discard(canonical_id)
        if filepath:
            state.active_skills.discard(filepath)
        state.active_skills.discard(target_key)
        if inst:
            state.active_skills.discard(inst.name)
            state.active_skills.discard(inst.name.lower())
            state.active_skills.discard(getattr(inst, "_slug", ""))

    state.refresh_static_context()
    return {
        "status": "ok",
        "skill": canonical_id,
        "name": inst.name if inst else canonical_id,
        "enabled": req.enabled,
        "active_count": len(state.active_skills)
    }



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

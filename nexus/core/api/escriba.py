"""core/api/escriba.py — Endpoints de ESCRIBA Engine para la API Web de Jellyfish."""

import os
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.api.deps import get_state

router = APIRouter(prefix="/escriba")
logger = logging.getLogger("jellyfish.api.escriba")


class EscribaNodeRequest(BaseModel):
    id: Optional[str] = None
    label: str
    type: str
    description: Optional[str] = ""
    color: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None


class EscribaLinkRequest(BaseModel):
    source: str
    target: str
    relation: Optional[str] = "relacionado"
    weight: Optional[int] = 1


class EscribaProjectSwitchRequest(BaseModel):
    project_id: str


VALID_GENRES = [
    "Fantasía Épica / Alta Fantasía",
    "Fantasía Oscura / Grimdark",
    "Ciencia Ficción / Cyberpunk",
    "Ciencia Ficción / Space Opera",
    "Thriller / Suspenso Psicológico",
    "Novela Negra / Policial & Detective",
    "Ficción Histórica / Épica Militar",
    "Realismo Mágico",
    "Drama / Ficción Contemporánea",
    "Ensayo / Crónica Documental",
    "Terror / Horror Cósmico",
    "Filosofía / Ensayo Especulativo",
]

VALID_TONES = [
    "Solemne, Inmersivo y Detallado",
    "Intimista y Primera Persona",
    "Dramático y Tenso",
    "Oscuro, Crudo y Sombrío",
    "Épico y Heroico",
    "Analítico, Frío y Documental",
    "Poético y Filosófico",
    "Satírico y Humoresco",
]


class EscribaProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    genre: Optional[str] = VALID_GENRES[0]
    tone: Optional[str] = VALID_TONES[0]


class EscribaChapterRequest(BaseModel):
    id: Optional[str] = None
    title: str
    content: str
    status: Optional[str] = "Borrador"


class EscribaCharacterDebateRequest(BaseModel):
    dilemma: Optional[str] = None
    character_a_id: Optional[str] = None
    character_b_id: Optional[str] = None
    character_ids: Optional[list] = None
    scene_prompt: Optional[str] = None
    num_turns: Optional[int] = 3


class EscribaProcessRequest(BaseModel):
    mode: str
    text: Optional[str] = ""
    target_label: Optional[str] = None
    event_text: Optional[str] = None
    selected_modules: Optional[list] = None
    factions: Optional[list] = None
    isolated_chars: Optional[list] = None
    context_lines: Optional[list] = None


class EscribaNexusRequest(BaseModel):
    lens_ids: Optional[list] = None
    active_lenses: Optional[list] = None
    project_id: Optional[str] = None


@router.get("/state")
async def get_escriba_state():
    """Retorna el estado del motor ESCRIBA (activo, tema, proyecto activo)."""
    try:
        from core.escriba_engine import is_escriba_active, get_active_project_id
        return {
            "active": is_escriba_active(),
            "project_id": get_active_project_id()
        }
    except Exception as e:
        return {"active": False, "error": str(e)}


@router.post("/toggle")
async def toggle_escriba():
    """Alterna el estado activo de ESCRIBA Engine."""
    state = get_state()
    try:
        current = getattr(state, "escriba_active", False)
        state.escriba_active = not current
        return {"status": "ok", "escriba_active": state.escriba_active}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph")
async def get_escriba_graph():
    """Retorna el grafo de entidades y relaciones de ESCRIBA."""
    state = get_state()
    try:
        from core.escriba_engine import load_escriba_graph
        graph_data = load_escriba_graph(state.active_project)
        return graph_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/graph/extract")
async def extract_graph_from_manuscript_endpoint():
    """Extrae automáticamente entidades y relaciones desde el manuscrito completo del proyecto."""
    state = get_state()
    try:
        from core.escriba_engine import extract_and_save_graph_from_manuscript
        result = extract_and_save_graph_from_manuscript(state.active_project, state)
        if result.get("status") == "error":
            raise HTTPException(status_code=400, detail=result.get("message"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error extrayendo grafo desde manuscrito: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/node")
@router.post("/graph/nodes")
async def add_or_update_node(req: EscribaNodeRequest):
    """Agrega o actualiza un nodo en el grafo de ESCRIBA."""
    state = get_state()
    try:
        from core.escriba_engine import save_escriba_node, load_escriba_graph
        node = req.model_dump()
        result = save_escriba_node(state.active_project, node)
        updated_graph = load_escriba_graph(state.active_project)
        return {"status": "ok", "node": result, "graph": updated_graph, "nodes": updated_graph.get("nodes", []), "links": updated_graph.get("links", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/node/{node_id}")
@router.delete("/graph/nodes/{node_id}")
async def delete_node(node_id: str):
    """Elimina un nodo del grafo."""
    state = get_state()
    try:
        from core.escriba_engine import delete_escriba_node, load_escriba_graph
        delete_escriba_node(state.active_project, node_id)
        updated_graph = load_escriba_graph(state.active_project)
        return {"status": "ok", "deleted_id": node_id, "graph": updated_graph, "nodes": updated_graph.get("nodes", []), "links": updated_graph.get("links", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/link")
async def add_or_update_link(req: EscribaLinkRequest):
    """Agrega o actualiza una relación en el grafo."""
    state = get_state()
    try:
        from core.escriba_engine import save_escriba_link, load_escriba_graph
        link = req.model_dump()
        result = save_escriba_link(state.active_project, link)
        updated_graph = load_escriba_graph(state.active_project)
        return {"status": "ok", "link": result, "graph": updated_graph, "nodes": updated_graph.get("nodes", []), "links": updated_graph.get("links", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process")
async def process_escriba_task(req: EscribaProcessRequest):
    """Ejecuta tareas de IA del motor ESCRIBA (dominó, análisis histórico, vacíos, auditoría, ensamble)."""
    state = get_state()
    try:
        from core.escriba_engine import execute_escriba_task
        extra_params = req.model_dump()
        result = execute_escriba_task(req.mode, req.text or "", state, extra_params)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nexus")
@router.post("/nexus")
async def analyze_nexus_endpoint(req: Optional[EscribaNexusRequest] = None):
    """Intersección topológica instantánea de vecindarios de nodos (Nexo Analítico 0 Tokens)."""
    state = get_state()
    try:
        from core.escriba_engine import load_escriba_graph, analyze_nexus_intersections
        graph_data = load_escriba_graph(state.active_project)
        active_lenses = []
        if req:
            active_lenses = req.lens_ids or req.active_lenses or []
        if not active_lenses:
            active_lenses = [n["id"] for n in graph_data.get("nodes", [])[:3]]
        
        intersections = analyze_nexus_intersections(graph_data, active_lenses)
        return {
            "status": "ok",
            "count": len(intersections),
            "nexus_entities": intersections,
            "intersections": intersections,
            "analysis": (
                f"Nexo detectado: **{len(intersections)} entidad(es)** conectada(s) a los lentes seleccionados.\n\n"
                + "\n".join(f"- **{e['label']}** ({e['type']})" for e in intersections)
                if intersections
                else "No se encontraron entidades compartidas en este cruce analítico."
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


from fastapi import UploadFile, File

@router.post("/import")
async def import_manuscript_file(file: UploadFile = File(...)):
    """Importa un archivo de manuscrito (.txt, .md, .json) como nuevo capítulo en Canva."""
    state = get_state()
    try:
        content_bytes = await file.read()
        content_str = content_bytes.decode("utf-8", errors="ignore")
        filename = file.filename or "Manuscrito_Importado.txt"
        title = os.path.splitext(filename)[0].replace("_", " ")

        from core.escriba_engine import save_escriba_chapter, load_escriba_chapters
        chap_data = {
            "title": title,
            "content": content_str,
            "wordCount": len(content_str.split()),
            "status": "Borrador"
        }
        all_chaps = save_escriba_chapter(state.active_project, chap_data)
        saved_chap = all_chaps[-1] if all_chaps else chap_data
        return {"status": "ok", "chapters": all_chaps, "chapter": saved_chap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chapters")
async def get_escriba_chapters():
    """Retorna los capítulos o manuscritos del Canva."""
    state = get_state()
    try:
        from core.escriba_engine import load_escriba_chapters
        chapters = load_escriba_chapters(state.active_project)
        return {"chapters": chapters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chapters")
async def save_escriba_chapters_endpoint(req: EscribaChapterRequest):
    """Guarda o actualiza un capítulo en el Canva."""
    state = get_state()
    try:
        from core.escriba_engine import save_escriba_chapter
        chap = req.model_dump()
        chap["wordCount"] = len((req.content or "").split())
        result = save_escriba_chapter(state.active_project, chap)
        saved_chap = next((c for c in result if c.get("id") == chap.get("id") or c.get("title") == chap.get("title")), chap)
        return {"status": "ok", "chapters": result, "chapter": saved_chap}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chapters/{chap_id}")
async def delete_escriba_chapter_endpoint(chap_id: str):
    """Elimina un capítulo del manuscrito."""
    state = get_state()
    try:
        from core.escriba_engine import delete_escriba_chapter
        result = delete_escriba_chapter(state.active_project, chap_id)
        return {"status": "ok", "chapters": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/character-debate")
async def character_debate(req: EscribaCharacterDebateRequest):
    """Inicia un debate entre dos o más personajes de la historia."""
    state = get_state()
    try:
        from core.escriba_engine import run_character_debate
        dilemma = req.dilemma or req.scene_prompt or "Debate de alianzas y convicciones"
        char_a = req.character_a_id or (req.character_ids[0] if req.character_ids and len(req.character_ids) > 0 else "Personaje_A")
        char_b = req.character_b_id or (req.character_ids[1] if req.character_ids and len(req.character_ids) > 1 else "Personaje_B")
        
        debate_result = run_character_debate(
            state,
            dilemma=dilemma,
            char_a_id=char_a,
            char_b_id=char_b
        )
        dialogue = debate_result.get("debate_transcript", "")
        return {
            "status": "ok",
            "debate": debate_result,
            "dialogue": dialogue,
            "characters": [debate_result.get("char_a"), debate_result.get("char_b")]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/options")
async def get_escriba_options():
    """Retorna los géneros literarios y tonos narrativos válidos respaldados en el backend."""
    return {
        "genres": VALID_GENRES,
        "tones": VALID_TONES
    }


@router.get("/projects")
async def get_escriba_projects():
    """Retorna la lista completa de proyectos narrativos en ESCRIBA."""
    from core.escriba_engine import load_escriba_projects
    projects = load_escriba_projects()
    return {"projects": projects}


@router.post("/projects")
async def create_escriba_project(req: EscribaProjectCreateRequest):
    """Crea un nuevo proyecto narrativo en ESCRIBA."""
    import time
    state = get_state()
    from core.escriba_engine import load_escriba_projects, save_escriba_projects
    projects = load_escriba_projects()

    for p in projects:
        p["active"] = False

    genre_val = req.genre if req.genre in VALID_GENRES else (VALID_GENRES[0] if VALID_GENRES else "Fantasía Épica / Alta Fantasía")
    tone_val = req.tone if req.tone in VALID_TONES else (VALID_TONES[0] if VALID_TONES else "Solemne, Inmersivo y Detallado")

    new_id = f"proj_{int(time.time() * 1000)}"
    new_proj = {
        "id": new_id,
        "title": req.name.strip(),
        "name": req.name.strip(),
        "description": req.description.strip() if req.description else "",
        "genre": genre_val,
        "tone": tone_val,
        "active": True,
        "createdAt": int(time.time() * 1000)
    }
    projects.append(new_proj)
    save_escriba_projects(projects)

    state.active_project = new_id
    return {"status": "ok", "project": new_proj, "projects": projects}


@router.post("/projects/switch")
async def switch_escriba_project(project_id: Optional[str] = None, req: Optional[EscribaProjectSwitchRequest] = None):
    """Cambia el proyecto activo de ESCRIBA."""
    import core.api.deps as deps
    state = get_state()
    from core.escriba_engine import load_escriba_projects, save_escriba_projects
    target_id = project_id or (req.project_id if req else None)
    if not target_id:
        raise HTTPException(status_code=400, detail="project_id es requerido")

    projects = load_escriba_projects()
    found = False
    for p in projects:
        if str(p.get("id")) == str(target_id):
            p["active"] = True
            found = True
        else:
            p["active"] = False

    if not found:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")

    save_escriba_projects(projects)
    state.active_project = str(target_id)

    # Restablecer la sesión activa para cargar chats del nuevo proyecto
    deps._active_session_id = None
    state.history.clear()

    return {"status": "ok", "active_project_id": target_id, "projects": projects}


@router.delete("/projects/{project_id}")
async def delete_escriba_project_endpoint(project_id: str):
    """Elimina un proyecto de ESCRIBA y borra todas sus conversaciones asociadas."""
    state = get_state()
    from core.escriba_engine import delete_escriba_project
    from core.api.deps import delete_sessions_by_project, purge_orphaned_escriba_sessions, _ensure_sessions_loaded
    import core.api.deps as deps

    _ensure_sessions_loaded()

    # 1. Eliminar permanentemente todos los chats del proyecto eliminado
    delete_sessions_by_project(project_id)

    # 2. Eliminar proyecto de disco y archivos de capítulos/grafos
    remaining = delete_escriba_project(project_id)

    # 3. Si no quedan proyectos, purgar cualquier chat huérfano restante
    if not remaining:
        state.active_project = None
        purge_orphaned_escriba_sessions()
        deps._active_session_id = None
        state.history.clear()
        state.session_tokens = 0
    else:
        active_proj = next((p for p in remaining if p.get("active")), None)
        if active_proj:
            state.active_project = str(active_proj["id"])
        else:
            remaining[0]["active"] = True
            state.active_project = str(remaining[0]["id"])

        # Seleccionar sesión activa correspondiente al nuevo proyecto activo si existe
        matching = [s for s in deps._chat_sessions.values() if str(s.get("project_id")) == str(state.active_project)]
        if matching:
            best = max(matching, key=lambda s: s.get("created_at", 0))
            deps._active_session_id = best["id"]
            state.history.clear()
            for msg in best.get("history", []):
                state.history.append(msg)
        else:
            deps._active_session_id = None
            state.history.clear()

    return {
        "status": "ok",
        "deleted": project_id,
        "projects": remaining,
        "active_session_id": deps._active_session_id
    }


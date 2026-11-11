"""core/api/chat.py — Endpoints de chat, sesiones y streaming SSE para Jellyfish Web OS."""

import time
import re
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from core.api.deps import (
    get_state, get_rag, _chat_sessions, _active_session_id,
    _ensure_sessions_loaded, save_session_to_db, delete_session_from_db,
    clear_all_sessions_from_db
)

router = APIRouter()
logger = logging.getLogger("jellyfish.api.chat")


class ChatRequest(BaseModel):
    message: str
    display_text: Optional[str] = None
    agent: Optional[str] = None
    session_id: Optional[str] = None
    session_title: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    agent: str
    model: str
    provider: str


class NewChatRequest(BaseModel):
    title: Optional[str] = None


class SwitchSessionRequest(BaseModel):
    session_id: str


class RenameSessionRequest(BaseModel):
    session_id: str
    title: str


class DeleteSessionRequest(BaseModel):
    session_id: str


class ForkSessionRequest(BaseModel):
    until_index: int



def get_current_engine_mode(state) -> str:
    from core.escriba_engine import is_escriba_active
    escriba_on = bool(getattr(state, "escriba_active", False) or is_escriba_active())
    if escriba_on:
        return "escriba"
    elif getattr(state, "scrum_active", False):
        return "jellyfish"
    else:
        return "nexus"


@router.get("/chat/sessions")
async def get_chat_sessions():
    """Retorna las sesiones de chat filtradas estrictamente por modo y proyecto activo."""
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    deps.purge_orphaned_escriba_sessions()

    state = get_state()
    current_mode = get_current_engine_mode(state)
    from core.escriba_engine import get_active_project_id
    active_escriba_pid = state.active_project or get_active_project_id()
    if active_escriba_pid and not state.active_project:
        state.active_project = str(active_escriba_pid)
    active_proj = str(state.active_project) if (state.active_project and str(state.active_project).strip()) else None

    sessions_list = []
    for s in deps._chat_sessions.values():
        eng = s.get("engine")
        if not eng:
            if s.get("is_escriba") or s.get("engine") == "escriba":
                eng = "escriba"
            elif s.get("is_jellyfish") or s.get("engine") in ["jellyfish", "scrum"]:
                eng = "jellyfish"
            else:
                eng = "nexus"

        is_escriba = (eng == "escriba" or bool(s.get("is_escriba")))
        is_jellyfish = (eng == "jellyfish" or bool(s.get("is_jellyfish")) or eng == "scrum")

        if current_mode == "escriba":
            # Si no hay proyecto activo o el chat no pertenece al proyecto activo, NO mostrar
            if not is_escriba or not active_proj:
                continue
            s_proj = str(s.get("project_id")) if s.get("project_id") else None
            if s_proj != active_proj:
                continue
        elif current_mode == "jellyfish":
            if not is_jellyfish:
                continue
        else:
            # Modo Nexus
            if is_escriba or is_jellyfish or s.get("project_id"):
                continue

        sessions_list.append({
            **s,
            "engine": eng,
            "is_escriba": is_escriba,
            "is_jellyfish": is_jellyfish
        })

    sorted_sessions = sorted(sessions_list, key=lambda s: s["title"].lower())

    active_valid = any(s["id"] == deps._active_session_id for s in sorted_sessions)
    if not active_valid:
        deps._active_session_id = sorted_sessions[0]["id"] if sorted_sessions else None

    return {
        "sessions": sorted_sessions,
        "active_session_id": deps._active_session_id
    }


@router.get("/history")
async def get_history():
    """Retorna el historial de chat de la sesión activa de forma resiliente."""
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    deps.purge_orphaned_escriba_sessions()

    state = get_state()
    current_mode = get_current_engine_mode(state)
    from core.escriba_engine import get_active_project_id
    active_escriba_pid = state.active_project or get_active_project_id()
    if active_escriba_pid and not state.active_project:
        state.active_project = str(active_escriba_pid)
    active_proj = str(state.active_project) if (state.active_project and str(state.active_project).strip()) else None

    current_session = deps._chat_sessions.get(deps._active_session_id) if deps._active_session_id else None
    
    if current_session:
        is_escriba = current_session.get("is_escriba") or current_session.get("engine") == "escriba"
        is_jellyfish = current_session.get("is_jellyfish") or current_session.get("engine") in ["jellyfish", "scrum"]
        if current_mode == "escriba":
            if not is_escriba or not active_proj or str(current_session.get("project_id")) != active_proj:
                current_session = None
        elif current_mode == "jellyfish":
            if not is_jellyfish:
                current_session = None
        else:
            if is_escriba or is_jellyfish or current_session.get("project_id"):
                current_session = None

    if not current_session and deps._chat_sessions:
        matching_sessions = [
            s for s in deps._chat_sessions.values()
            if (current_mode == "escriba" and (s.get("is_escriba") or s.get("engine") == "escriba") and active_proj and str(s.get("project_id")) == active_proj) or
               (current_mode == "jellyfish" and (s.get("is_jellyfish") or s.get("engine") in ["jellyfish", "scrum"])) or
               (current_mode == "nexus" and not s.get("is_escriba") and not s.get("is_jellyfish") and not s.get("project_id") and s.get("engine") not in ["escriba", "jellyfish", "scrum"])
        ]
        if matching_sessions:
            best_session = max(matching_sessions, key=lambda s: s.get("created_at", 0))
            deps._active_session_id = best_session["id"]
            current_session = best_session
        else:
            deps._active_session_id = None
            current_session = None

    if not current_session:
        state.history.clear()
        return {"history": []}

    deps.ensure_session_history_loaded(current_session["id"])
    sanitized_history = []
    for msg in current_session.get("history") or []:
        c = msg.get("content", "")
        if msg.get("role") == "user" and "INSTRUCCIÓN GENERAL:" in c:
            m = re.search(r"INSTRUCCIÓN GENERAL:\s*(.*?)(?=\n\nBORRADOR ACTUAL|\Z)", c, re.DOTALL)
            if m and m.group(1).strip():
                c = m.group(1).strip()
        elif msg.get("role") == "user" and "FRAGMENTO SELECCIONADO:" in c and "ESPECIFICACIÓN:" in c:
            m = re.search(r"ESPECIFICACIÓN:\s*(.*?)(?=\Z)", c, re.DOTALL)
            if m and m.group(1).strip():
                c = m.group(1).strip()
        sanitized_history.append({**msg, "content": c})

    state.history.clear()
    for msg in sanitized_history:
        state.history.append(msg)

    return {"history": sanitized_history}


@router.post("/chat/new")
async def new_chat(req: Optional[NewChatRequest] = None):
    """Prepara la vista para un nuevo chat."""
    import core.api.deps as deps
    state = get_state()
    current_mode = get_current_engine_mode(state)
    if current_mode == "escriba":
        from core.escriba_engine import get_active_project_id
        active_pid = state.active_project or get_active_project_id()
        if not active_pid:
            raise HTTPException(
                status_code=400,
                detail="Para crear un nuevo chat en ESCRIBA es obligatorio tener un proyecto activo."
            )
        state.active_project = str(active_pid)

    deps._active_session_id = None
    state.history.clear()
    state.session_tokens = 0
    return {
        "status": "ok",
        "session_id": None,
        "title": "Nuevo Chat",
        "message": "Chat preparado. La sesión se creará al enviar tu primer mensaje."
    }


@router.post("/chat/sessions/switch")
async def switch_session(req: SwitchSessionRequest):
    """Cambia la sesión de chat activa."""
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    state = get_state()

    if req.session_id not in deps._chat_sessions:
        raise HTTPException(status_code=404, detail="Sesión de chat no encontrada")

    deps._active_session_id = req.session_id
    deps.ensure_session_history_loaded(req.session_id)
    target_session = deps._chat_sessions[deps._active_session_id]

    state.history.clear()
    for msg in target_session.get("history") or []:
        state.history.append(msg)

    return {
        "status": "ok",
        "active_session_id": deps._active_session_id,
        "title": target_session["title"],
        "history": target_session.get("history") or []
    }


@router.post("/chat/sessions/rename")
async def rename_session(req: RenameSessionRequest):
    """Renombra una sesión de chat existente."""
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    if req.session_id not in deps._chat_sessions:
        raise HTTPException(status_code=404, detail="Sesión de chat no encontrada")

    clean_title = req.title.strip()
    if not clean_title:
        raise HTTPException(status_code=400, detail="El título no puede estar vacío")

    deps._chat_sessions[req.session_id]["title"] = clean_title
    save_session_to_db(deps._chat_sessions[req.session_id])
    return {
        "status": "ok",
        "session_id": req.session_id,
        "title": clean_title
    }


@router.post("/chat/sessions/fork")
async def fork_session(req: ForkSessionRequest):
    """Bifurca la sesión de chat activa hasta el índice de mensaje especificado y la liga al proyecto activo."""
    import os
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    state = get_state()

    current_session = deps._chat_sessions.get(deps._active_session_id)
    if not current_session:
        raise HTTPException(status_code=404, detail="No hay sesión activa para bifurcar")

    history_slice = current_session.get("history", [])[:req.until_index + 1]
    
    active_project_name = os.path.basename(state.active_project) if state.active_project else "General"
    branch_title = f"Rama: {current_session['title']} [{active_project_name}]"
    
    new_id = f"fork_{int(time.time() * 1000)}"
    deps._active_session_id = new_id
    
    new_session = {
        "id": new_id,
        "title": branch_title,
        "project": active_project_name,
        "created_at": time.time(),
        "history": list(history_slice),
        "engine": current_session.get("engine", "nexus"),
        "is_escriba": bool(current_session.get("is_escriba")),
        "is_jellyfish": bool(current_session.get("is_jellyfish")),
        "project_id": current_session.get("project_id") or (str(state.active_project) if state.active_project else None)
    }
    
    deps._chat_sessions[new_id] = new_session
    save_session_to_db(new_session)
    
    state.history.clear()
    for msg in history_slice:
        state.history.append(msg)

    return {
        "status": "ok",
        "active_session_id": new_id,
        "title": branch_title,
        "history": history_slice,
        "sessions": list(deps._chat_sessions.values())
    }


@router.post("/chat/sessions/delete")
async def delete_session(req: DeleteSessionRequest):
    """Elimina una sesión de chat."""
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    state = get_state()

    if req.session_id in deps._chat_sessions:
        del deps._chat_sessions[req.session_id]
        delete_session_from_db(req.session_id)

    if req.session_id == deps._active_session_id or deps._active_session_id not in deps._chat_sessions:
        if deps._chat_sessions:
            deps._active_session_id = next(iter(deps._chat_sessions.keys()))
            target_session = deps._chat_sessions[deps._active_session_id]
            state.history.clear()
            for msg in target_session.get("history", []):
                state.history.append(msg)
        else:
            deps._active_session_id = None
            state.history.clear()

    return {
        "status": "ok",
        "deleted_session_id": req.session_id,
        "active_session_id": deps._active_session_id,
        "sessions": list(deps._chat_sessions.values())
    }


@router.post("/chat/sessions/delete_all")
async def delete_all_chat_sessions():
    """Elimina todas las sesiones de chat."""
    import core.api.deps as deps
    state = get_state()
    deps._chat_sessions.clear()
    deps._active_session_id = None
    clear_all_sessions_from_db()
    state.history.clear()
    state.session_tokens = 0
    return {
        "status": "ok",
        "message": "Todas las sesiones han sido eliminadas",
        "sessions": [],
        "active_session_id": None
    }


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Procesa un mensaje del usuario a través del motor LLM real de Jellyfish."""
    import core.api.deps as deps
    deps._ensure_sessions_loaded()
    state = get_state()
    rag = get_rag()

    user_input = req.message.strip()
    if not user_input:
        raise HTTPException(status_code=400, detail="Mensaje vacío")

    current_mode = get_current_engine_mode(state)
    from core.escriba_engine import get_active_project_id
    active_escriba_pid = state.active_project or get_active_project_id()
    if active_escriba_pid and not state.active_project:
        state.active_project = str(active_escriba_pid)

    if current_mode == "escriba":
        if not active_escriba_pid:
            raise HTTPException(
                status_code=400,
                detail="Para interactuar en el chat de ESCRIBA es obligatorio tener un proyecto activo."
            )

    if req.session_id:
        deps._active_session_id = req.session_id
        if req.session_id not in deps._chat_sessions:
            deps._chat_sessions[req.session_id] = {
                "id": req.session_id,
                "title": req.session_title or "Fragmento",
                "created_at": time.time(),
                "history": [],
                "engine": current_mode,
                "is_escriba": (current_mode == "escriba"),
                "is_jellyfish": (current_mode == "jellyfish"),
                "project_id": str(active_escriba_pid) if current_mode == "escriba" else None
            }
        current_session = deps._chat_sessions[req.session_id]
        if current_mode == "escriba":
            current_session["engine"] = "escriba"
            current_session["is_escriba"] = True
            current_session["project_id"] = str(active_escriba_pid)
    else:
        current_session = deps._chat_sessions.get(deps._active_session_id) if deps._active_session_id else None
        if not current_session:
            clean_title = user_input[:30].strip()
            if len(user_input) > 30:
                clean_title += "..."
            clean_title = clean_title.capitalize() or "Nuevo Chat"

            new_id = f"session_{int(time.time() * 1000)}"
            deps._active_session_id = new_id
            current_session = {
                "id": new_id,
                "title": clean_title,
                "created_at": time.time(),
                "history": [],
                "engine": current_mode,
                "is_escriba": (current_mode == "escriba"),
                "is_jellyfish": (current_mode == "jellyfish"),
                "project_id": str(active_escriba_pid) if current_mode == "escriba" else None
            }
            deps._chat_sessions[new_id] = current_session
        elif len(current_session.get("history") or []) == 0:
            clean_title = user_input[:30].strip()
            if len(user_input) > 30:
                clean_title += "..."
            current_session["title"] = clean_title.capitalize() or "Nuevo Chat"
            current_session["engine"] = current_mode
            current_session["is_escriba"] = (current_mode == "escriba")
            current_session["is_jellyfish"] = (current_mode == "jellyfish")
            if current_mode == "escriba":
                current_session["project_id"] = str(active_escriba_pid)

    deps.ensure_session_history_loaded(current_session["id"])
    if current_session.get("history") is None:
        current_session["history"] = []

    # Cambio de agente con @
    if user_input.startswith("@"):
        if user_input.lower() == "@exit":
            state.load_agent("default")
            save_session_to_db(current_session)
            return ChatResponse(
                response="Agente cambiado a default",
                agent=state.active_agent,
                model=state.model,
                provider=state.provider,
            )
        agent_name = user_input[1:].lower().strip()
        from core.agents.registry import AgentRegistry
        if AgentRegistry.has(agent_name):
            state.load_agent(agent_name)
            save_session_to_db(current_session)
            return ChatResponse(
                response=f"Agente cambiado a {agent_name}",
                agent=state.active_agent,
                model=state.model,
                provider=state.provider,
            )
        else:
            raise HTTPException(status_code=404, detail=f"Agente @{agent_name} no encontrado")

    # Comandos slash
    if user_input.startswith("/"):
        cmd = user_input.split()[0].lower()
        if cmd == "/help":
            commands_help = (
                "## Comandos Disponibles\n\n"
                "| Comando | Descripción |\n"
                "|---------|-------------|\n"
                "| `/help` | Ver esta guía |\n"
                "| `/status` | Estado del sistema |\n"
                "| `/clear` | Limpiar historial |\n"
                "| `@agente` | Cambiar de agente |\n"
                "| `@exit` | Volver al agente default |\n"
            )
            return ChatResponse(response=commands_help, agent=state.active_agent, model=state.model, provider=state.provider)
        elif cmd == "/status":
            status_text = (
                f"**Agente:** @{state.active_agent}\n"
                f"**Proveedor:** {state.provider}\n"
                f"**Modelo:** {state.model}\n"
                f"**Proyecto:** {os.path.basename(state.active_project) if state.active_project else 'Ninguno'}\n"
                f"**RAG:** {rag.status_text if rag else 'Inactivo'}"
            )
            return ChatResponse(response=status_text, agent=state.active_agent, model=state.model, provider=state.provider)
        elif cmd == "/clear":
            current_session["history"].clear()
            state.history.clear()
            save_session_to_db(current_session)
            return ChatResponse(response="[OK] Historial limpiado.", agent=state.active_agent, model=state.model, provider=state.provider)

    rag_context = ""
    if rag and rag.is_active:
        try:
            rag_context = rag.query_code(user_input)
        except Exception:
            pass

    if req.display_text and req.display_text.strip():
        clean_user_input = req.display_text.strip()
    elif "INSTRUCCIÓN GENERAL:" in user_input:
        match = re.search(r"INSTRUCCIÓN GENERAL:\s*(.*?)(?=\n\nBORRADOR ACTUAL|\Z)", user_input, re.DOTALL)
        clean_user_input = match.group(1).strip() if match and match.group(1).strip() else "Modificación en Canva"
    elif "FRAGMENTO SELECCIONADO:" in user_input and "ESPECIFICACIÓN:" in user_input:
        match = re.search(r"ESPECIFICACIÓN:\s*(.*?)(?=\Z)", user_input, re.DOTALL)
        clean_user_input = match.group(1).strip() if match and match.group(1).strip() else "Edición en Canva"
    else:
        clean_user_input = re.sub(r'^\s*\[ESCRIBA Canva[^\]]*\]\s*', '', user_input).strip()
    user_msg = {"role": "user", "content": clean_user_input if clean_user_input else user_input}
    current_session["history"].append(user_msg)
    state.history.append(user_msg)

    try:
        from core.llm_engine import _call_llm_silent

        messages = list(state.static_history)
        if rag_context:
            messages.append({"role": "user", "content": f"[RAG CONTEXT]\n{rag_context}"})

        matched_chap = None
        is_edit_instruction = False
        is_canva_request = False
        is_escriba_mode = bool(getattr(state, "escriba_active", False))

        if is_escriba_mode:
            try:
                from core.escriba_engine import load_escriba_chapters
                chaps = load_escriba_chapters(state.active_project)

                quoted_titles = re.findall(r"['\"`]([^'\"`]+)['\"`]", user_input)
                low_input = user_input.lower()

                if chaps:
                    for q in quoted_titles:
                        q_norm = q.strip().lower()
                        for c in chaps:
                            c_title_norm = c.get("title", "").strip().lower()
                            if q_norm == c_title_norm or q_norm in c_title_norm or c_title_norm in q_norm:
                                matched_chap = c
                                break
                        if matched_chap:
                            break

                    if not matched_chap:
                        for c in chaps:
                            c_title = c.get("title", "").strip()
                            if c_title and (c_title.lower() in low_input or (len(c_title) > 5 and c_title.lower() in low_input)):
                                matched_chap = c
                                break

                is_edit_instruction = matched_chap is not None or any(
                    kw in low_input for kw in ["modifica el capítulo", "modificación general al capítulo", "edita el capítulo", "reescribe el capítulo", "actualiza el capítulo"]
                )

                is_canva_request = "[ESCRIBA Canva" in user_input or is_edit_instruction or any(
                    kw in low_input for kw in [
                        "crear canva", "crea canva", "crear un canva", "crea un canva",
                        "en canva", "en el canva", "escribe en canva", "escribir en canva",
                        "crear en canva", "al canva", "para el canva", "haz un canva", "hacer un canva",
                        "crear canva sobre", "crea canva sobre"
                    ]
                )

                if matched_chap:
                    messages.append({
                        "role": "system",
                        "content": (
                            f"[MODIFICACIÓN DE CAPÍTULO EXISTENTE EN CANVA DE ESCRIBA]\n"
                            f"Título del Capítulo a Modificar: '{matched_chap.get('title')}'\n"
                            f"Contenido Actual del Capítulo:\n{matched_chap.get('content', '')}\n\n"
                            f"INSTRUCCIONES DE MODIFICACIÓN DEL USUARIO:\n{user_input}\n\n"
                            "REGLAS OBLIGATORIAS:\n"
                            "1. Aplica las modificaciones manteniendo el estilo solicitado.\n"
                            "2. Genera el texto completo modificado y refinado del capítulo.\n"
                            "3. EXTENSIÓN LIBRE: Extiéndete tanto como sea necesario para enriquecer y completar la escena. El motor se encargará de fragmentar al guardar.\n"
                            "4. NO incluyas frases introductorias ni metacomentarios. Simplemente entrega el texto narrativo directo."
                        )
                    })
                elif is_canva_request:
                    messages.append({
                        "role": "system",
                        "content": (
                            "[CREACIÓN Y REDACCIÓN EN CANVA DE ESCRIBA]\n"
                            "El usuario ha solicitado redactar contenido para el Canva del proyecto.\n"
                            "DIRECTRICES DE EXTENSIÓN Y CALIDAD:\n"
                            "1. EXTENSIÓN ILIMITADA: NO te limites en longitud ni trates de comprimir el texto a un único fragmento corto. Tienes plena libertad para extenderte tanto como puedas, desarrollando la historia, escenas, diálogos, atmósfera y detalles narrativos con máxima profundidad.\n"
                            "2. El motor de ESCRIBA segmentará automáticamente el manuscrito en fragmentos configurados al momento de guardarlo, por lo que debes priorizar la riqueza narrativa sin preocuparte por el límite de caracteres.\n"
                            "3. Entrega exclusivamente el texto narrativo directo, sin frases meta introductorias, sin saludos y sin conclusiones de despedida."
                        )
                    })
                elif chaps:
                    manuscript_parts = []
                    for idx, c in enumerate(chaps, 1):
                        chap_title = c.get("title", f"Capítulo {idx}")
                        chap_content = c.get("content", "").strip()
                        if chap_content:
                            manuscript_parts.append(f"### {chap_title}\n{chap_content}")
                        else:
                            manuscript_parts.append(f"### {chap_title}\n(Borrador sin texto)")
                    
                    full_manuscript = "\n\n".join(manuscript_parts)
                    messages.append({
                        "role": "system",
                        "content": (
                            "[MANUSCRITO Y CANVA DE ESCRIBA — FUENTE PRINCIPAL DE INFORMACIÓN]\n"
                            "A continuación se presenta el contenido completo redactado en el Canva del proyecto activo:\n\n"
                            f"{full_manuscript}\n\n"
                            "INSTRUCCIONES DE ANÁLISIS:\n"
                            "Analiza exhaustivamente el texto anterior para responder a la solicitud del usuario (grafo semántico, personajes, lugares, facciones, alianzas, vacíos narrativos, simulaciones o correcciones). "
                            "NO digas que no hay un proyecto activo ni que no tienes acceso al manuscrito, ya que el texto anterior ES el manuscrito del proyecto."
                        )
                    })
                elif user_input.startswith("[ESCRIBA Engine —"):
                    messages.append({
                        "role": "system",
                        "content": (
                            "[MANUSCRITO DE ESCRIBA]\n"
                            "El Canva de Escriba actualmente no contiene capítulos ni borrador guardado. "
                            "Explica amablemente al usuario que para analizar entidades, relaciones, o el grafo semántico del proyecto, primero debe escribir o cargar un borrador en el Canva."
                        )
                    })

                # Inyección activa de protocolos literarios y lentes analíticos del proyecto
                from core.escriba_engine import load_escriba_protocols, format_protocol_system_prompt
                proj_protocols = load_escriba_protocols(state.active_project)
                proto_prompt = format_protocol_system_prompt(proj_protocols)
                if proto_prompt:
                    messages.append({
                        "role": "system",
                        "content": proto_prompt
                    })
            except Exception as e_man:
                logger.warning("Error al inyectar manuscrito o protocolos de ESCRIBA: %s", e_man)

        for msg in current_session["history"]:
            messages.append(msg)

        response_text = await run_in_threadpool(_call_llm_silent, state, messages, agent_name=state.active_agent)

        if not response_text:
            response_text = "[Error] No se recibió respuesta del modelo. Verifica que Ollama esté activo o que tu API key sea válida."

        response_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL).strip()

        if is_escriba_mode and user_input.startswith("[ESCRIBA Engine — Grafo Semántico"):
            try:
                from core.escriba_engine import extract_and_save_graph_from_manuscript
                graph_res = extract_and_save_graph_from_manuscript(state.active_project, state)
                if graph_res.get("status") == "ok":
                    response_text = (
                        f"### Extracción de Grafo Semántico Completada\n\n"
                        f"He analizado el manuscrito del proyecto y sincronizado el grafo semántico con éxito:\n\n"
                        f"- **Entidades extraídas:** {graph_res.get('nodes_added', 0)} nuevas (Total: {graph_res.get('total_nodes', 0)})\n"
                        f"- **Relaciones vinculadas:** {graph_res.get('links_added', 0)} nuevas (Total: {graph_res.get('total_links', 0)})\n\n"
                        f"Puedes consultar el mapa interactivo de relaciones, alianzas y facciones en la sección **Grafo Semántico & Relaciones**."
                    )
                else:
                    response_text = f"[Aviso] {graph_res.get('message', 'No se pudieron extraer entidades del manuscrito.')}"
            except Exception as e_ge:
                logger.error("Error al extraer grafo desde chat: %s", e_ge)

        if is_escriba_mode and (is_canva_request or matched_chap):
            try:
                from core.escriba_engine import save_escriba_chapter

                clean_content = re.sub(r'^\s*\[ESCRIBA Canva[^\]]*\]\s*', '', response_text).strip()
                meta_patterns = [
                    r'^(?:claro|por supuesto|aquí tienes|con gusto|a continuación)[^\n]*:\s*',
                    r'^aquí está [^\n]*:\s*'
                ]
                for pat in meta_patterns:
                    clean_content = re.sub(pat, '', clean_content, flags=re.IGNORECASE).strip()

                if matched_chap:
                    target_title = matched_chap.get("title", "Capítulo de Canva")
                    words = len(clean_content.split())
                    matched_chap["content"] = clean_content
                    matched_chap["wordCount"] = words
                    save_escriba_chapter(state.active_project, matched_chap)

                    paragraphs = [p.strip() for p in clean_content.split("\n") if p.strip()]
                    excerpt = paragraphs[0] if paragraphs else ""
                    if len(excerpt) > 200:
                        excerpt = excerpt[:197] + "..."

                    response_text = (
                        f"### Capítulo Actualizado en Canva\n\n"
                        f"**Capítulo:** {target_title}\n"
                        f"**Métricas:** {words} palabras • Borrador\n\n"
                        f"He aplicado las modificaciones solicitadas directamente al capítulo en el Canva."
                    )
                else:
                    raw_title = re.sub(r'^\s*\[ESCRIBA Canva[^\]]*\]\s*', '', user_input).strip()
                    title_triggers = [
                        "aplica la siguiente modificación general al capítulo",
                        "modifica el capítulo", "edita el capítulo", "reescribe el capítulo",
                        "crear un canva sobre", "crear canva sobre", "crea un canva sobre", "crea canva sobre",
                        "crear un canva de", "crear canva de", "crea un canva de", "crea canva de",
                        "crear un canva", "crear canva", "crea un canva", "crea canva",
                        "escribe un resumen de", "escribe un resumen", "escribe una historia de",
                        "escribe en el canva", "escribe en canva", "escribir en canva", "en el canva", "en canva"
                    ]
                    clean_title = raw_title
                    low_raw = raw_title.lower()
                    for trg in title_triggers:
                        if low_raw.startswith(trg):
                            clean_title = raw_title[len(trg):].strip()
                            break

                    q_matches = re.findall(r"['\"`]([^'\"`]+)['\"`]", clean_title)
                    if q_matches:
                        clean_title = q_matches[0]

                    from core.escriba_engine import load_escriba_chapters
                    existing_chaps = load_escriba_chapters(state.active_project)
                    clean_title = f"Fragmento {len(existing_chaps) + 1}"

                    new_chap = {
                        "id": f"chap_{int(time.time() * 1000)}",
                        "title": clean_title,
                        "content": clean_content,
                        "status": "Borrador",
                        "createdAt": int(time.time() * 1000),
                        "wordCount": len(clean_content.split())
                    }
                    updated_chapters = save_escriba_chapter(state.active_project, new_chap)
                    words = len(clean_content.split())

                    # Calcular si el contenido se dividió en fragmentos
                    matching_frags = [c for c in updated_chapters if clean_title in c.get("title", "") or (c.get("id", "").startswith(new_chap["id"]))]
                    frag_count = max(1, len(matching_frags))
                    frag_badge = f"{frag_count} fragmento{'s' if frag_count > 1 else ''}"

                    paragraphs = [p.strip() for p in clean_content.split("\n") if p.strip()]
                    excerpt = paragraphs[0] if paragraphs else ""
                    if len(excerpt) > 200:
                        excerpt = excerpt[:197] + "..."

                    response_text = (
                        f"### Contenido Registrado en Canva\n\n"
                        f"**Capítulo:** {clean_title}\n"
                        f"**Métricas:** {words} palabras • {frag_badge} • Borrador\n\n"
                        f"El manuscrito completo ha sido registrado directamente en el panel lateral del Canva."
                    )
            except Exception as chap_err:
                logger.error("Error al guardar capítulo en Canva: %s", chap_err)

        assistant_msg = {"role": "assistant", "content": response_text}
        current_session["history"].append(assistant_msg)
        state.history.append(assistant_msg)
        save_session_to_db(current_session)

        return ChatResponse(
            response=response_text,
            agent=state.active_agent,
            model=state.model,
            provider=state.provider,
        )
    except Exception as e:
        logger.error("Error en chat endpoint: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/stream")
async def chat_stream(prompt: str):
    """Endpoint Server-Sent Events (SSE) para enviar respuestas token a token a la Web UI."""
    import core.api.deps as deps
    state = get_state()

    def event_generator():
        try:
            from core.llm_engine import stream_ollama
            messages = list(state.static_history)
            messages.append({"role": "user", "content": prompt})

            for chunk in stream_ollama(state.model, messages, base_url=state.ollama_base_url):
                if chunk:
                    data = json.dumps({"token": chunk})
                    yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            err_data = json.dumps({"error": str(err)})
            yield f"data: {err_data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

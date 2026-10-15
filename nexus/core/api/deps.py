"""core/api/deps.py — Estado compartido y persistencia SQLite para la API Web de Jellyfish."""

import os
import json
import time
import logging
import threading
from typing import Dict, Any, Optional

logger = logging.getLogger("jellyfish.api.deps")

# Singleton del estado de Jellyfish
_state = None
_state_lock = threading.Lock()
_rag = None

# Gestión de Sesiones de Chat
_chat_sessions: Dict[str, Dict[str, Any]] = {}
_active_session_id: Optional[str] = None
_sessions_loaded = False


def _get_db_path() -> str:
    from core.state import AGENCY_DIR
    return os.path.join(AGENCY_DIR, "jellyfish_state.db")


def _connect_db():
    import sqlite3
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path, check_same_thread=False, timeout=10.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS web_chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT,
                created_at REAL,
                history_json TEXT,
                is_escriba INTEGER DEFAULT 0,
                engine TEXT DEFAULT 'general',
                project_id TEXT
            )
        """)
        # Migración silenciosa de columnas si la tabla ya existía sin ellas
        try:
            conn.execute("ALTER TABLE web_chat_sessions ADD COLUMN is_escriba INTEGER DEFAULT 0")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE web_chat_sessions ADD COLUMN engine TEXT DEFAULT 'general'")
        except Exception:
            pass
        try:
            conn.execute("ALTER TABLE web_chat_sessions ADD COLUMN project_id TEXT")
        except Exception:
            pass
    except Exception as e:
        logger.warning("Error inicializando tabla web_chat_sessions: %s", e)
    return conn


def _ensure_sessions_loaded():
    global _sessions_loaded, _chat_sessions, _active_session_id
    if _sessions_loaded:
        return
    with _state_lock:
        if _sessions_loaded:
            return
        try:
            conn = _connect_db()
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, created_at, history_json, is_escriba, engine, project_id FROM web_chat_sessions ORDER BY created_at ASC")
            rows = cursor.fetchall()
            conn.close()
            for r in rows:
                sid = r[0]
                title = r[1]
                created_at = r[2]
                history_json = r[3]
                is_escriba_raw = r[4]
                engine_raw = r[5]
                project_id_raw = r[6] if len(r) > 6 else None

                try:
                    history = json.loads(history_json) if history_json else []
                except Exception:
                    history = []

                is_escriba_val = bool(is_escriba_raw) if is_escriba_raw is not None else False
                engine_val = engine_raw if engine_raw else ("escriba" if is_escriba_val else "general")

                # Inferencia retrocompatible para sesiones heredadas
                if not is_escriba_val and not engine_raw:
                    if sid.startswith("escriba_") or "[ESCRIBA" in (title or "") or "[ESCRIBA" in (history_json or ""):
                        is_escriba_val = True
                        engine_val = "escriba"

                _chat_sessions[sid] = {
                    "id": sid,
                    "title": title,
                    "created_at": created_at,
                    "history": history,
                    "is_escriba": is_escriba_val,
                    "engine": engine_val,
                    "project_id": project_id_raw
                }
            if _chat_sessions and not _active_session_id:
                _active_session_id = next(iter(_chat_sessions.keys()))
        except Exception as e:
            logger.warning("No se pudieron cargar sesiones web de SQLite: %s", e)
        _sessions_loaded = True


def save_session_to_db(session: dict):
    try:
        conn = _connect_db()
        cursor = conn.cursor()
        is_escriba_val = 1 if (session.get("is_escriba") or session.get("engine") == "escriba") else 0
        engine_val = session.get("engine") or ("escriba" if is_escriba_val else "general")

        cursor.execute(
            "INSERT INTO web_chat_sessions (id, title, created_at, history_json, is_escriba, engine, project_id) VALUES (?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET title = excluded.title, history_json = excluded.history_json, is_escriba = excluded.is_escriba, engine = excluded.engine, project_id = excluded.project_id",
            (session["id"], session.get("title", "Chat"), session.get("created_at", time.time()), json.dumps(session.get("history", [])), is_escriba_val, engine_val, session.get("project_id"))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning("Error al guardar sesión %s en SQLite: %s", session.get("id"), e)


def delete_session_from_db(session_id: str):
    try:
        conn = _connect_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM web_chat_sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning("Error al borrar sesión %s de SQLite: %s", session_id, e)

def delete_sessions_by_project(project_id: str):
    global _active_session_id
    if not project_id:
        return

    _ensure_sessions_loaded()
    pid_str = str(project_id)

    # 1. Obtener metadatos del proyecto y sus capítulos antes del borrado
    proj_name = None
    chap_session_ids = []
    try:
        from core.escriba_engine import load_escriba_projects, load_escriba_chapters
        projects = load_escriba_projects()
        for p in projects:
            if str(p.get("id")) == pid_str:
                proj_name = p.get("name")
                break
        chaps = load_escriba_chapters(project_id)
        chap_session_ids = [f"escriba_chap_{c.get('id')}" for c in chaps if c.get("id")]
    except Exception as e:
        logger.warning("Error obteniendo metadatos del proyecto para borrado de chats: %s", e)

    # 2. Identificar sesiones en memoria que pertenecen al proyecto
    to_delete = set()
    with _state_lock:
        for sid, s in list(_chat_sessions.items()):
            s_pid = str(s.get("project_id")) if s.get("project_id") is not None else ""
            s_title = (s.get("title") or "").lower()
            s_is_escriba = bool(s.get("is_escriba")) or s.get("engine") == "escriba"

            match_pid = (s_pid == pid_str)
            match_chap = (sid in chap_session_ids)
            match_name = False
            if proj_name and len(proj_name.strip()) >= 2:
                pname_lower = proj_name.strip().lower()
                if f"[{pname_lower}]" in s_title or f"proyecto {pname_lower}" in s_title or pname_lower in s_title:
                    match_name = True

            if match_pid or match_chap or (s_is_escriba and match_name):
                to_delete.add(sid)

    to_delete_list = list(to_delete)

    # 3. Eliminar permanentemente de SQLite
    try:
        conn = _connect_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM web_chat_sessions WHERE project_id = ? OR project_id = ?", (pid_str, project_id))
        if chap_session_ids:
            placeholders = ",".join("?" for _ in chap_session_ids)
            cursor.execute(f"DELETE FROM web_chat_sessions WHERE id IN ({placeholders})", chap_session_ids)
        if to_delete_list:
            placeholders = ",".join("?" for _ in to_delete_list)
            cursor.execute(f"DELETE FROM web_chat_sessions WHERE id IN ({placeholders})", to_delete_list)
        if proj_name and len(proj_name.strip()) >= 2:
            pname_lower = proj_name.strip().lower()
            cursor.execute("DELETE FROM web_chat_sessions WHERE (is_escriba = 1 OR engine = 'escriba') AND (LOWER(title) LIKE ? OR LOWER(title) LIKE ?)",
                           (f"%[{pname_lower}]%", f"%{pname_lower}%"))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning("Error al borrar sesiones del proyecto %s de SQLite: %s", project_id, e)

    # 4. Eliminar de la memoria activa
    with _state_lock:
        for sid in to_delete:
            if sid in _chat_sessions:
                del _chat_sessions[sid]
        if _active_session_id in to_delete:
            _active_session_id = None


def purge_orphaned_escriba_sessions():
    global _active_session_id
    try:
        from core.escriba_engine import load_escriba_projects
        projects = load_escriba_projects()
        valid_project_ids = {str(p.get("id")) for p in projects if p.get("id")}
        valid_project_names = {str(p.get("name")).strip().lower() for p in projects if p.get("name")}
    except Exception as e:
        logger.warning("Error leyendo proyectos para purga: %s", e)
        return

    _ensure_sessions_loaded()
    to_delete = set()
    with _state_lock:
        for sid, s in list(_chat_sessions.items()):
            is_escriba = bool(s.get("is_escriba")) or s.get("engine") == "escriba"
            title_lower = (s.get("title") or "").lower()
            is_project_chat = is_escriba or ("proyecto " in title_lower) or ("escriba" in title_lower)

            if is_project_chat:
                proj_id = str(s.get("project_id")) if s.get("project_id") else None
                # Si no hay proyectos válidos en absoluto, cualquier chat de proyecto es huérfano
                if not valid_project_ids:
                    to_delete.add(sid)
                elif not proj_id or proj_id not in valid_project_ids:
                    # Comprobar si coincide con algún nombre de proyecto válido
                    has_valid_name = any(vname in title_lower for vname in valid_project_names if len(vname) >= 2)
                    if not has_valid_name:
                        to_delete.add(sid)

    to_delete_list = list(to_delete)
    if to_delete_list:
        try:
            conn = _connect_db()
            cursor = conn.cursor()
            placeholders = ",".join("?" for _ in to_delete_list)
            cursor.execute(f"DELETE FROM web_chat_sessions WHERE id IN ({placeholders})", to_delete_list)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.warning("Error purgando chats huerfanos de SQLite: %s", e)

        with _state_lock:
            for sid in to_delete_list:
                if sid in _chat_sessions:
                    del _chat_sessions[sid]
            if _active_session_id in to_delete_list:
                _active_session_id = None


def clear_all_sessions_from_db():
    try:
        conn = _connect_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM web_chat_sessions")
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning("Error al limpiar sesiones de SQLite: %s", e)


def get_state():
    """Inicializa el estado de Jellyfish de forma lazy y thread-safe."""
    global _state, _rag
    if _state is None:
        with _state_lock:
            if _state is None:
                from core.state import JellyfishState, DB_PATH
                from core.rag_coder import CodeKnowledgeBase
                from core.llm_engine import ensure_ollama_running

                _state = JellyfishState()
                ollama_ok = ensure_ollama_running(_state.ollama_base_url)
                _rag = CodeKnowledgeBase(
                    DB_PATH,
                    active_project=_state.active_project,
                    ollama_connected=ollama_ok,
                )
                _state.rag = _rag
    _ensure_sessions_loaded()
    return _state


def get_rag():
    get_state()
    return _rag

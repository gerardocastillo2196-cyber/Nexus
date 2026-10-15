"""core/state/persistence.py — Persistencia SQLite con WAL mode para Jellyfish OS."""

import os
import json
import logging
import sqlite3
import threading

logger = logging.getLogger("jellyfish.state.persistence")


def connect_db(db_path: str) -> sqlite3.Connection:
    """Abre una conexión a SQLite con WAL mode y timeout para concurrencia segura."""
    conn = sqlite3.connect(db_path, check_same_thread=False, timeout=10.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
    except Exception:
        pass
    return conn

_connect_db = connect_db


def save_state_var(db_path: str, key: str, value) -> None:
    try:
        conn = connect_db(db_path)
        cursor = conn.cursor()
        val_str = json.dumps(value)
        cursor.execute(
            "INSERT INTO global_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, val_str)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.warning("No se pudo persistir variable %s en SQLite: %s", key, e)


def get_state_var(db_path: str, key: str, default=None):
    if not os.path.exists(db_path):
        return default
    try:
        conn = connect_db(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM global_state WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
    except Exception as e:
        logger.warning("No se pudo leer variable %s de SQLite: %s", key, e)
    return default


class PersistedSet(set):
    """Conjunto persistido en SQLite para estado reactivo."""
    def __init__(self, state, key: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.state = state
        self.key = key
        saved = get_state_var(state._db_path, self.key, None)
        if saved is not None and isinstance(saved, list):
            super().update(saved)

    def add(self, element):
        super().add(element)
        save_state_var(self.state._db_path, self.key, list(self))

    def remove(self, element):
        super().remove(element)
        save_state_var(self.state._db_path, self.key, list(self))

    def discard(self, element):
        super().discard(element)
        save_state_var(self.state._db_path, self.key, list(self))

    def clear(self):
        super().clear()
        save_state_var(self.state._db_path, self.key, list(self))

    def update(self, *args):
        super().update(*args)
        save_state_var(self.state._db_path, self.key, list(self))


class PersistedHistoryList(list):
    """Lista de historial persistida en SQLite local con WAL mode."""
    def __init__(self, state, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.state = state
        self._lock = threading.RLock()
        from core.config import AGENCY_DIR
        self._db_path = os.path.join(AGENCY_DIR, "jellyfish_state.db")
        self._init_db()

    def _init_db(self):
        with self._lock:
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_path TEXT,
                    role TEXT,
                    content TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS global_state (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS web_chat_sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at REAL,
                    history_json TEXT
                )
            """)
            conn.commit()
            conn.close()

    def _get_project_path(self):
        return getattr(self.state, "active_project", "") or "default"

    def _truncate(self):
        with self._lock:
            max_size = int(os.getenv("JELLYFISH_MAX_HISTORY_SIZE", "30"))
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM history WHERE project_path = ?", (project,))
            count = cursor.fetchone()[0]
            if count > max_size:
                diff = count - max_size
                cursor.execute("SELECT id, role, content FROM history WHERE project_path = ? ORDER BY id ASC LIMIT ?", (project, diff))
                evicted = cursor.fetchall()
                evicted_ids = [row[0] for row in evicted]
                evicted_items = [{"role": row[1], "content": row[2]} for row in evicted]
                
                cursor.execute(f"DELETE FROM history WHERE id IN ({','.join('?' for _ in evicted_ids)})", evicted_ids)
                conn.commit()

                if hasattr(self.state, "summarized_message_count"):
                    self.state.summarized_message_count = max(0, self.state.summarized_message_count - diff)
                
                if hasattr(self.state, "rag") and self.state.rag and evicted_items:
                    try:
                        self.state.rag.index_history_memory(evicted_items)
                    except Exception as err:
                        logger.warning("No se pudieron vectorizar recuerdos expulsados: %s", err)
            conn.close()

    def append(self, item):
        with self._lock:
            role = item.get("role", "user")
            content = item.get("content", "")
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO history (project_path, role, content) VALUES (?, ?, ?)",
                (project, role, content)
            )
            conn.commit()
            conn.close()
            self._truncate()
            if hasattr(self.state, "save_history_to_project"):
                self.state.save_history_to_project()

    def extend(self, iterable):
        with self._lock:
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            for item in iterable:
                role = item.get("role", "user")
                content = item.get("content", "")
                cursor.execute(
                    "INSERT INTO history (project_path, role, content) VALUES (?, ?, ?)",
                    (project, role, content)
                )
            conn.commit()
            conn.close()
            self._truncate()
            if hasattr(self.state, "save_history_to_project"):
                self.state.save_history_to_project()

    def clear(self):
        with self._lock:
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute("DELETE FROM history WHERE project_path = ?", (project,))
            conn.commit()
            conn.close()
            if hasattr(self.state, "save_history_to_project"):
                self.state.save_history_to_project()

    def __len__(self):
        with self._lock:
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM history WHERE project_path = ?", (project,))
            count = cursor.fetchone()[0]
            conn.close()
            return count

    def __getitem__(self, index):
        with self._lock:
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            if isinstance(index, slice):
                cursor.execute("SELECT role, content FROM history WHERE project_path = ? ORDER BY id ASC", (project,))
                rows = cursor.fetchall()
                conn.close()
                return [{"role": r, "content": c} for r, c in rows[index]]
            if index < 0:
                cursor.execute("SELECT COUNT(*) FROM history WHERE project_path = ?", (project,))
                total = cursor.fetchone()[0]
                index = total + index
                if index < 0 or index >= total:
                    conn.close()
                    raise IndexError("list index out of range")
            cursor.execute("SELECT role, content FROM history WHERE project_path = ? ORDER BY id ASC LIMIT 1 OFFSET ?", (project, index))
            row = cursor.fetchone()
            conn.close()
            if not row:
                raise IndexError("list index out of range")
            return {"role": row[0], "content": row[1]}

    def __iter__(self):
        with self._lock:
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT role, content FROM history WHERE project_path = ? ORDER BY id ASC", (project,))
            rows = cursor.fetchall()
            conn.close()
            for row in rows:
                yield {"role": row[0], "content": row[1]}

    def __reversed__(self):
        with self._lock:
            project = self._get_project_path()
            conn = connect_db(self._db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT role, content FROM history WHERE project_path = ? ORDER BY id DESC", (project,))
            rows = cursor.fetchall()
            conn.close()
            for row in rows:
                yield {"role": row[0], "content": row[1]}

    def __bool__(self):
        return len(self) > 0

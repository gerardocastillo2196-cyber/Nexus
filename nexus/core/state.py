"""core/state.py — Alias de compatibilidad hacia core.state."""

from core.state.core import (
    JellyfishState,
    Blackboard,
    DB_PATH,
    PLUGINS_DIR,
    AGENCY_DIR,
)

__all__ = [
    "JellyfishState",
    "Blackboard",
    "DB_PATH",
    "PLUGINS_DIR",
    "AGENCY_DIR",
]

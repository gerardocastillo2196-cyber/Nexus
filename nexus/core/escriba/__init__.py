"""
core/escriba — Motor Narrativo & Arquitectura Teórica (ESCRIBA Engine).
Proporciona la gestión de borradores, Canva, grafo semántico y agencia teórica.
"""

from core.escriba_engine import (
    load_escriba_chapters,
    save_escriba_chapter,
    save_escriba_chapters,
    delete_escriba_chapter,
    is_escriba_active,
    get_active_project_id
)

__all__ = [
    "load_escriba_chapters",
    "save_escriba_chapter",
    "save_escriba_chapters",
    "delete_escriba_chapter",
    "is_escriba_active",
    "get_active_project_id"
]

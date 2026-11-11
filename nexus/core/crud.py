"""core/crud.py — Módulo puente de retrocompatibilidad para comandos slash y CRUD."""

from core.command_dispatcher import handle_slash_command
from core.commands.project import show_project_guide_if_needed

__all__ = ["handle_slash_command", "show_project_guide_if_needed"]

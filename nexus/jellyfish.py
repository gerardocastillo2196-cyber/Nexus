"""jellyfish.py — Módulo puente del motor Jellyfish dentro del ecosistema Nexus OS.

Exporta el orquestador ágil, registro de agentes y la utilidad forense _flush_crash_reports.
"""

import os
import datetime
import logging
from core.state import AGENCY_DIR
from core.jellyfish import ProjectOrchestrator, AgencyOrchestrator, AgentRegistry

logger = logging.getLogger("jellyfish.bridge")


def _flush_crash_reports(state):
    """Vuelca forzosamente cualquier error capturado en state.captured_errors a un reporte forense en disco."""
    if not hasattr(state, "captured_errors") or not state.captured_errors:
        return
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"jellyfish_error_report_{timestamp}.md"

    target_paths = [os.path.join(AGENCY_DIR, report_filename)]
    if getattr(state, "active_project", None) and os.path.isdir(state.active_project):
        proj_report = os.path.join(state.active_project, report_filename)
        if proj_report not in target_paths:
            target_paths.append(proj_report)

    content = (
        f"# 🛡️ Reporte Forense de Error — Jellyfish OS\n\n"
        f"**Fecha y Hora:** {datetime.datetime.now().isoformat()}\n"
        f"**Proyecto Activo:** `{getattr(state, 'active_project', 'Ninguno')}`\n"
        f"**Agente Activo:** `@{getattr(state, 'active_agent', 'default')}`\n"
        f"**Proveedor / Modelo:** `{getattr(state, 'provider', '')}` / `{getattr(state, 'model', '')}`\n\n"
        f"---\n"
        f"## 🚨 Traza de Errores Capturados ({len(state.captured_errors)}):\n\n"
    )
    for i, err in enumerate(state.captured_errors, 1):
        content += f"### Error #{i}\n```\n{err}\n```\n\n"

    for p in target_paths:
        try:
            with open(p, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            logger.error("No se pudo escribir el reporte de error en %s: %s", p, e)


__all__ = [
    "ProjectOrchestrator",
    "AgencyOrchestrator",
    "AgentRegistry",
    "_flush_crash_reports"
]

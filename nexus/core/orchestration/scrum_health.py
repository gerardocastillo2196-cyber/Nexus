"""core.orchestration.scrum_health — Monitor de Salud Continuo del Proyecto Scrum.

Analiza el estado de los artefactos del proyecto activo (BACKLOG.md, SPRINT_BOARD.md, DAILY.md)
para identificar estancamientos, cuellos de botella y sugerir acciones correctivas autónomas.
"""

import os
import json
import re
import logging
from typing import Dict, Any, List
from rich.console import Console
from rich.panel import Panel

logger = logging.getLogger("jellyfish.orchestration.scrum_health")
console = Console()


class ScrumHealthMonitor:
    """Monitor continuo del estado del proyecto Scrum."""

    def __init__(self, project_path: str):
        self.project_path = project_path

    def _safe_read(self, filename: str) -> str:
        filepath = os.path.join(self.project_path, filename)
        if os.path.isfile(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception as e:
                logger.warning("Error leyendo %s: %s", filename, e)
        return ""

    def diagnose(self) -> Dict[str, Any]:
        """Escanea el proyecto y genera un informe de salud estructurado."""
        report = {
            "project_path": self.project_path,
            "has_backlog": False,
            "total_stories": 0,
            "ready_stories": 0,
            "unvalidated_stories": 0,
            "has_sprint_board": False,
            "todo_tasks": 0,
            "in_progress_tasks": 0,
            "done_tasks": 0,
            "has_daily": False,
            "daily_entries_count": 0,
            "health_score": 100,
            "warnings": [],
            "recommendations": [],
        }

        if not self.project_path or not os.path.isdir(self.project_path):
            report["health_score"] = 0
            report["warnings"].append("No hay un proyecto activo vinculado.")
            report["recommendations"].append("Vincular un proyecto con /project new o /project.")
            return report

        # 1. Inspeccionar Backlog
        backlog_json_str = self._safe_read("BACKLOG.json")
        backlog_md_str = self._safe_read("BACKLOG.md")

        if backlog_json_str or backlog_md_str:
            report["has_backlog"] = True
            stories = []
            if backlog_json_str:
                try:
                    data = json.loads(backlog_json_str)
                    if isinstance(data, dict):
                        stories = data.get("user_stories", [])
                    elif isinstance(data, list):
                        stories = data
                except Exception:
                    pass

            if not stories and backlog_md_str:
                matches = re.findall(r'###\s+(US-\d+)', backlog_md_str)
                stories = [{"id": m} for m in matches]

            report["total_stories"] = len(stories)
            ready_count = 0
            for s in stories:
                is_ready = s.get("dor_ready", False)
                if not is_ready:
                    # Validar si contiene MoSCoW y Criterios en Markdown/JSON
                    has_moscow = bool(s.get("prioridad") or "MoSCoW" in backlog_md_str)
                    has_criteria = bool(s.get("criterios_aceptacion") or "Criterios de Aceptación" in backlog_md_str)
                    if has_moscow and has_criteria:
                        is_ready = True
                if is_ready:
                    ready_count += 1

            report["ready_stories"] = ready_count
            report["unvalidated_stories"] = max(0, len(stories) - ready_count)

            if len(stories) == 0:
                report["warnings"].append("El BACKLOG está vacío.")
                report["recommendations"].append("Ejecutar el Product Owner para generar historias de usuario en el Backlog.")
                report["health_score"] -= 30
            elif report["unvalidated_stories"] > 0:
                report["warnings"].append(f"Hay {report['unvalidated_stories']} historias en el Backlog que no han sido validadas según la DoR.")
                report["recommendations"].append("Invocar al @qa_engineer para ejecutar la auditoría de Definition of Ready (DoR).")
                report["health_score"] -= 20
        else:
            report["warnings"].append("No se encontró el archivo BACKLOG.md/BACKLOG.json en el proyecto.")
            report["recommendations"].append("Ejecutar /auto o invocar a @product_owner para crear el Product Backlog inicial.")
            report["health_score"] -= 30

        # 2. Inspeccionar Sprint Board
        board_json_str = self._safe_read("SPRINT_BOARD.json")
        board_md_str = self._safe_read("SPRINT_BOARD.md")

        if board_json_str or board_md_str:
            report["has_sprint_board"] = True
            tasks = []
            if board_json_str:
                try:
                    data = json.loads(board_json_str)
                    if isinstance(data, list):
                        tasks = data
                except Exception:
                    pass

            if not tasks and board_md_str:
                from core.project_orchestrator import _parse_sprint_tasks
                tasks = _parse_sprint_tasks(board_md_str)

            for t in tasks:
                st = str(t.get("status", "TODO")).upper()
                if st in ("DONE", "HECHO", "COMPLETADO"):
                    report["done_tasks"] += 1
                elif st in ("IN_PROGRESS", "EN PROCESO", "DOING"):
                    report["in_progress_tasks"] += 1
                else:
                    report["todo_tasks"] += 1

            if len(tasks) == 0 and report["total_stories"] > 0:
                report["warnings"].append("El SPRINT_BOARD está vacío a pesar de existir historias listas en el Backlog.")
                report["recommendations"].append("Iniciar el evento de 'Sprint Planning' guiado por el @scrum_master.")
                report["health_score"] -= 25

        # 3. Inspeccionar Daily Log
        daily_str = self._safe_read("DAILY.md")
        if daily_str:
            report["has_daily"] = True
            entries = re.findall(r'###\s+\[.*\]', daily_str)
            report["daily_entries_count"] = len(entries)

        report["health_score"] = max(0, report["health_score"])
        return report

    def display_report(self) -> None:
        """Muestra el reporte de salud de forma gráfica con Rich Console."""
        diag = self.diagnose()
        score = diag["health_score"]

        color = "green" if score >= 80 else "yellow" if score >= 50 else "red"
        lines = [
            f"[METRICAS] **Puntaje de Salud Scrum:** [{color}]{score}/100[/{color}]",
            f"  • **Historias en Backlog:** {diag['total_stories']} (Ready: {diag['ready_stories']} | Pendientes DoR: {diag['unvalidated_stories']})",
            f"  • **Tareas en Sprint Board:** TODO: {diag['todo_tasks']} | En Proceso: {diag['in_progress_tasks']} | DONE: {diag['done_tasks']}",
            f"  • **Registros en DAILY.md:** {diag['daily_entries_count']}",
            "",
        ]

        if diag["warnings"]:
            lines.append("[ADVERTENCIA] **Advertencias Detectadas:**")
            for w in diag["warnings"]:
                lines.append(f"  - {w}")
            lines.append("")

        if diag["recommendations"]:
            lines.append("[SUGERENCIA] **Recomendaciones Proactivas:**")
            for r in diag["recommendations"]:
                lines.append(f"  - {r}")

        panel = Panel("\n".join(lines), title="[bold cyan][JELLYFISH] Diagnóstico de Salud Scrum — Jellyfish OS[/bold cyan]", border_style=color)
        console.print(panel)

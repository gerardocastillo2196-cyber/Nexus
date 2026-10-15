"""Pruebas unitarias para la Evolución de Siguiente Nivel de Scrum en Jellyfish OS.

Verifica:
1. Monitoreo continuo de salud Scrum (ScrumHealthMonitor).
2. Validación proactiva DoR por @qa_engineer y logging en DAILY.md.
3. Evento Sprint Planning automático y definición de Sprint Goal por @scrum_master.
4. Plantillas ricas de historias de usuario con Gherkin y MoSCoW.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import MagicMock
from core.orchestration.scrum_health import ScrumHealthMonitor
from core.orchestration.product_owner import ProductOwnerPhase
from core.orchestration.scrum_master import ScrumMasterPhase
from core.commands.project import _BACKLOG_TEMPLATE


class TestScrumEvolution(unittest.TestCase):
    """Suite de pruebas para la Evolución Scrum de Siguiente Nivel."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="jellyfish_scrum_test_")

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_scrum_health_monitor_empty_project(self):
        """Verifica el diagnóstico de salud en un proyecto recién inicializado."""
        monitor = ScrumHealthMonitor(self.test_dir)
        diag = monitor.diagnose()

        self.assertFalse(diag["has_backlog"])
        self.assertFalse(diag["has_sprint_board"])
        self.assertLess(diag["health_score"], 100)
        self.assertTrue(len(diag["warnings"]) > 0)

    def test_scrum_health_monitor_populated_project(self):
        """Verifica el diagnóstico de salud en un proyecto con artefactos cargados."""
        backlog_md = "# Backlog\n### US-001: Autenticación\n- Prioridad (MoSCoW): Must-have\n- Criterios de Aceptación: Dado un correo..."
        sprint_board_md = "## 📋 POR HACER (TODO)\n| ID | Tarea | Asignado | Estimación | Entregable | Dependencias |\n| T-001 | Login | @dev | S | main.py | Ninguna |"
        daily_md = "### [2026-09-05] @scrum_master — Sprint Planning"

        with open(os.path.join(self.test_dir, "BACKLOG.md"), "w", encoding="utf-8") as f:
            f.write(backlog_md)
        with open(os.path.join(self.test_dir, "SPRINT_BOARD.md"), "w", encoding="utf-8") as f:
            f.write(sprint_board_md)
        with open(os.path.join(self.test_dir, "DAILY.md"), "w", encoding="utf-8") as f:
            f.write(daily_md)

        monitor = ScrumHealthMonitor(self.test_dir)
        diag = monitor.diagnose()

        self.assertTrue(diag["has_backlog"])
        self.assertTrue(diag["has_sprint_board"])
        self.assertTrue(diag["has_daily"])
        self.assertEqual(diag["todo_tasks"], 1)
        self.assertEqual(diag["health_score"], 100)

    def test_product_owner_dor_validation_logging(self):
        """Valida que run_dor_validation registre el evento y sugerencias en DAILY.md."""
        backlog_md = "# Backlog\n### US-001: Test\n- Prioridad (MoSCoW): Must-have"
        with open(os.path.join(self.test_dir, "BACKLOG.md"), "w", encoding="utf-8") as f:
            f.write(backlog_md)
        with open(os.path.join(self.test_dir, "DAILY.md"), "w", encoding="utf-8") as f:
            f.write("# Daily Log\n")

        mock_orch = MagicMock()
        mock_orch.project_path = self.test_dir
        mock_orch._read_project_file.side_effect = lambda f: open(os.path.join(self.test_dir, f), encoding="utf-8").read() if os.path.exists(os.path.join(self.test_dir, f)) else ""
        def write_file(f, c):
            with open(os.path.join(self.test_dir, f), "w", encoding="utf-8") as file:
                file.write(c)
            return True
        mock_orch._write_project_file.side_effect = write_file
        mock_orch._call_agent.return_value = '{"ready": true, "reason": "Backlog completo y listo."}'
        mock_orch.metrics = []

        po_phase = ProductOwnerPhase(mock_orch)
        res = po_phase.run_dor_validation()

        self.assertTrue(res)
        daily_content = open(os.path.join(self.test_dir, "DAILY.md"), encoding="utf-8").read()
        self.assertIn("@qa_engineer", daily_content)
        self.assertIn("Auditoría Definition of Ready", daily_content)

    def test_scrum_master_sprint_planning_event(self):
        """Valida que run_sprint_planning registre el evento Sprint Goal en DAILY.md."""
        with open(os.path.join(self.test_dir, "DAILY.md"), "w", encoding="utf-8") as f:
            f.write("# Daily Log\n")

        mock_orch = MagicMock()
        mock_orch.project_path = self.test_dir
        mock_orch.board_filename = "SPRINT_BOARD.md"
        mock_orch.state.active_agency = "development"
        mock_orch._read_project_file.side_effect = lambda f: open(os.path.join(self.test_dir, f), encoding="utf-8").read() if os.path.exists(os.path.join(self.test_dir, f)) else ""
        def write_file(f, c):
            with open(os.path.join(self.test_dir, f), "w", encoding="utf-8") as file:
                file.write(c)
            return True
        mock_orch._write_project_file.side_effect = write_file
        mock_orch._load_agent_prompt.return_value = "Eres @scrum_master"
        mock_orch._get_last_exit_code.return_value = 0
        mock_orch._call_agent.return_value = (
            "## 📋 POR HACER (TODO)\n"
            "| ID | Tarea | Asignado | Estimación | Entregable | Dependencias |\n"
            "|---|---|---|---|---|---|\n"
            "| T-001 | [US-000] Setup | @autodetect | S | main.py | Ninguna |\n"
        )

        sm_phase = ScrumMasterPhase(mock_orch)
        res = sm_phase.run_sprint_planning("Idea de prueba")

        self.assertTrue(res)
        daily_content = open(os.path.join(self.test_dir, "DAILY.md"), encoding="utf-8").read()
        self.assertIn("@scrum_master", daily_content)
        self.assertIn("Sprint Goal", daily_content)

    def test_enriched_backlog_template(self):
        """Valida que la plantilla por defecto de BACKLOG.md incluya Gherkin y MoSCoW."""
        self.assertIn("Criterios de Aceptación (Gherkin)", _BACKLOG_TEMPLATE)
        self.assertIn("Prioridad (MoSCoW)", _BACKLOG_TEMPLATE)
        self.assertIn("Sprint 0: Infraestructura", _BACKLOG_TEMPLATE)


if __name__ == "__main__":
    unittest.main()

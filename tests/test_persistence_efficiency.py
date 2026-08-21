import unittest
import os
import shutil
import tempfile
import sqlite3
from core.state import JellyfishState, PersistedHistoryList, PersistedSet
from core.rag_coder import build_dynamic_rag_context

class TestPersistenceEfficiency(unittest.TestCase):

    def setUp(self):
        # Crear un proyecto temporal y redirigir el directorio del estado a una base de datos de pruebas
        self.test_dir = tempfile.mkdtemp()
        self.state = JellyfishState()
        self.state.active_project = self.test_dir

    def tearDown(self):
        # Limpiar directorio de pruebas
        shutil.rmtree(self.test_dir)
        # Limpiar base de datos
        db_path = self.state.history._db_path
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except OSError:
                pass

    def test_history_sqlite_persistence(self):
        """Verifica que el historial de chat se inserte y recupere desde SQLite."""
        history = self.state.history
        history.clear()
        self.assertEqual(len(history), 0)

        # Insertar elementos
        history.append({"role": "user", "content": "Hola @CEO"})
        history.append({"role": "assistant", "content": "Hola usuario"})
        self.assertEqual(len(history), 2)

        # Validar recuperación indexada
        self.assertEqual(history[0]["content"], "Hola @CEO")
        self.assertEqual(history[1]["role"], "assistant")
        self.assertEqual(history[-1]["content"], "Hola usuario")

        # Validar rebanado (slices)
        sliced = history[-2:]
        self.assertEqual(len(sliced), 2)
        self.assertEqual(sliced[0]["content"], "Hola @CEO")

    def test_set_persistence(self):
        """Verifica que los conjuntos persistentes (active_skills, context_files) guarden en SQLite."""
        self.state.active_skills.clear()
        self.state.active_skills.add("skill_a.py")
        self.state.active_skills.add("skill_b.py")

        # Crear nueva instancia para forzar recarga desde base de datos
        new_state = JellyfishState()
        self.assertIn("skill_a.py", new_state.active_skills)
        self.assertIn("skill_b.py", new_state.active_skills)

    def test_property_persistence(self):
        """Verifica que variables globales del estado (global_status, active_agent) se persistan."""
        self.state.global_status = "ERROR"
        self.state.active_agent = "scrum_master"

        # Crear nueva instancia para recargar
        new_state = JellyfishState()
        self.assertEqual(new_state.global_status, "ERROR")
        self.assertEqual(new_state.active_agent, "scrum_master")

    def test_build_dynamic_rag_context(self):
        """Verifica que build_dynamic_rag_context ensamble y filtre documentos en disco."""
        # Crear un archivo de prueba relevante
        schema_path = os.path.join(self.test_dir, "DATA_SCHEMA.md")
        with open(schema_path, "w", encoding="utf-8") as f:
            f.write("# Schema de datos de prueba")

        # Crear archivo no relevante
        tree_path = os.path.join(self.test_dir, "PROJECT_TREE.md")
        with open(tree_path, "w", encoding="utf-8") as f:
            f.write("# Arbol de proyecto de prueba")

        # Consultar contexto para una tarea de base de datos
        ctx = build_dynamic_rag_context(
            project_path=self.test_dir,
            task_desc="Modificar base de datos o tablas",
            output_file="test.py"
        )
        # DATA_SCHEMA es de base de datos y siempre relevante; PROJECT_TREE no se menciona
        self.assertIn("DATA_SCHEMA.md", ctx)
        self.assertIn("Schema de datos de prueba", ctx)

    def test_is_new_project_heurisitc(self):
        """Verifica la heurística de is_new_project."""
        from core.orchestration.build_healer import is_new_project
        
        # Un directorio temporal nuevo/vacío debe dar True
        self.assertTrue(is_new_project(self.test_dir))

        # Crear archivos de Jellyfish no debe romper el True
        with open(os.path.join(self.test_dir, "backlog.md"), "w") as f:
            f.write("backlog")
        self.assertTrue(is_new_project(self.test_dir))

        # Crear un archivo de código debe dar False (proyecto cargado existente)
        with open(os.path.join(self.test_dir, "main.cpp"), "w") as f:
            f.write("int main() {}")
        self.assertFalse(is_new_project(self.test_dir))

    def test_get_sentinel_healer_system(self):
        """Verifica que el prompt de Sentinel cambie dinámicamente según el modo."""
        from core.orchestration.build_healer import get_sentinel_healer_system

        # Modo autonomous no debe tener ASK_USER
        prompt_auto = get_sentinel_healer_system("autonomous")
        self.assertNotIn("ASK_USER", prompt_auto)

        # Modo interactive debe tener ASK_USER
        prompt_inter = get_sentinel_healer_system("interactive")
        self.assertIn("ASK_USER", prompt_inter)

    def test_docker_syntax_validation(self):
        """Verifica que validate_syntax detecte mezcla de sintaxis en Dockerfile y Compose."""
        from core.orchestration.code_analyzer import validate_syntax

        # 1. Dockerfile con Compose syntax
        bad_dockerfile_path = os.path.join(self.test_dir, "Dockerfile")
        with open(bad_dockerfile_path, "w") as f:
            f.write("version: '3.8'\nservices:\n  app:\n    image: node:18")
        
        ok, msg = validate_syntax(bad_dockerfile_path)
        self.assertFalse(ok)
        self.assertIn("sintaxis de docker-compose", msg)

        # 2. Dockerfile correcto
        good_dockerfile_path = os.path.join(self.test_dir, "Dockerfile_good")
        with open(good_dockerfile_path, "w") as f:
            f.write("FROM fedora:latest\nRUN dnf update -y\nCMD ['bash']")
        
        ok, msg = validate_syntax(good_dockerfile_path)
        self.assertTrue(ok)

        # 3. Compose con Dockerfile syntax
        bad_compose_path = os.path.join(self.test_dir, "docker-compose.yml")
        with open(bad_compose_path, "w") as f:
            f.write("version: '3.8'\nFROM node:18\nRUN npm install")
        
        ok, msg = validate_syntax(bad_compose_path)
        self.assertFalse(ok)
        self.assertIn("instruccion de Dockerfile", msg)

        # 4. Compose correcto
        good_compose_path = os.path.join(self.test_dir, "docker-compose_good.yml")
        with open(good_compose_path, "w") as f:
            f.write("services:\n  app:\n    build: .\n    volumes:\n      - .:/app")
        
        ok, msg = validate_syntax(good_compose_path)
        self.assertTrue(ok)

if __name__ == "__main__":
    unittest.main()

import unittest

class TestAutonomousHITLSuppression(unittest.TestCase):

    def test_trivial_hitl_keywords_detection(self):
        """Verifica que preguntas triviales de permiso sean identificadas correctamente."""
        trivial_queries = [
            "¿Desea ver el contenido actual del archivo docker-compose.yml antes de hacer los cambios?",
            "¿Quieres ver el archivo requirements.txt?",
            "¿Puedo modificar el archivo main.py?",
            "Por favor confirme si deseas corregir el archivo."
        ]
        
        trivial_keywords = ["desea ver", "deseas ver", "quieres ver", "puedo modificar", "puedo cambiar", "confirmación", "deseas corregir"]
        
        for q in trivial_queries:
            is_trivial = any(kw in q.lower() for kw in trivial_keywords)
            self.assertTrue(is_trivial, f"La pregunta '{q}' debió ser detectada como trivial.")

    def test_non_trivial_hitl_question(self):
        """Verifica que preguntas legítimas de negocio no sean marcadas como triviales."""
        legit_query = "¿Prefiere utilizar la fórmula Harris-Benedict o Mifflin-St Jeor para los cálculos calóricos?"
        trivial_keywords = ["desea ver", "deseas ver", "quieres ver", "puedo modificar", "puedo cambiar", "confirmación", "deseas corregir"]
        is_trivial = any(kw in legit_query.lower() for kw in trivial_keywords)
        self.assertFalse(is_trivial)

    def test_sudo_apt_interception_keywords(self):
        """Verifica la detección de comandos prohibidos en la máquina host."""
        forbidden_cmds = [
            "sudo apt update && sudo apt install python3-tk",
            "apt-get install -y sqlite3",
            "sudo pacman -S docker",
            "dnf install gcc"
        ]
        
        for cmd in forbidden_cmds:
            cmd_lower = cmd.lower()
            is_forbidden = ("sudo " in cmd_lower or "apt " in cmd_lower or "apt-get" in cmd_lower or "pacman" in cmd_lower or "dnf " in cmd_lower)
            self.assertTrue(is_forbidden, f"El comando '{cmd}' debió ser bloqueado por seguridad.")

if __name__ == "__main__":
    unittest.main()

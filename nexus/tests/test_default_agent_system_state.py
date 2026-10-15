import unittest
from core.state import JellyfishState


class TestDefaultAgentSystemState(unittest.TestCase):

    def test_default_agent_system_state_injection(self):
        state = JellyfishState()
        state.load_agent("default")
        
        system_prompt = state.system_prompt
        
        # 1. Verificar título del System State / Protocolo Maestro
        self.assertIn("PROTOCOLO MAESTRO", system_prompt)
        self.assertIn("GOD MODE", system_prompt)
        
        # 2. Verificar sección de Asistente General de IA
        self.assertIn("JELLYFISH OS", system_prompt)
        
        # 3. Verificar Aislamiento de Rol
        self.assertIn("AISLAMIENTO DE ROL", system_prompt)


if __name__ == "__main__":
    unittest.main()

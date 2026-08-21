import unittest
import json
from core.llm_engine import _prepare_payload
from core.orchestration.task_runner import AGENT_OUTPUT_SCHEMA

class TestStructuredOutputs(unittest.TestCase):

    def test_prepare_payload_ollama_schema(self):
        """Verifica que _prepare_payload configure format con el esquema en Ollama."""
        schema = {
            "type": "object",
            "properties": {"test": {"type": "string"}},
            "required": ["test"]
        }
        payload = _prepare_payload(
            provider_name="ollama",
            url="http://localhost:11434/api/chat",
            model_name="qwen2.5-coder:latest",
            messages=[],
            json_schema=schema
        )
        self.assertEqual(payload.get("format"), schema)

    def test_prepare_payload_openai_schema(self):
        """Verifica que _prepare_payload configure response_format en OpenAI."""
        schema = {
            "type": "object",
            "properties": {"test": {"type": "string"}},
            "required": ["test"]
        }
        payload = _prepare_payload(
            provider_name="openai",
            url="https://api.openai.com/v1/chat/completions",
            model_name="gpt-4o",
            messages=[],
            json_schema=schema
        )
        resp_format = payload.get("response_format", {})
        self.assertEqual(resp_format.get("type"), "json_schema")
        self.assertEqual(resp_format.get("json_schema", {}).get("schema"), schema)

    def test_agent_output_schema_structure(self):
        """Verifica los campos requeridos en AGENT_OUTPUT_SCHEMA."""
        self.assertIn("thought_process", AGENT_OUTPUT_SCHEMA["properties"])
        self.assertIn("run_command", AGENT_OUTPUT_SCHEMA["properties"])
        self.assertIn("ask_user", AGENT_OUTPUT_SCHEMA["properties"])
        self.assertIn("target_file", AGENT_OUTPUT_SCHEMA["properties"])
        self.assertIn("source_code", AGENT_OUTPUT_SCHEMA["properties"])
        self.assertListEqual(
            sorted(AGENT_OUTPUT_SCHEMA["required"]),
            sorted(["thought_process", "run_command", "ask_user", "target_file", "source_code"])
        )

if __name__ == "__main__":
    unittest.main()

"""tests/conftest.py — Fixtures compartidos para la suite de pruebas de Jellyfish OS."""

import os
import tempfile
import pytest
from unittest.mock import MagicMock

from core.state import JellyfishState


@pytest.fixture
def temp_project_dir():
    """Crea un directorio de proyecto temporal aislado para pruebas."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.fixture
def mock_state(temp_project_dir):
    """Proporciona una instancia aislada de JellyfishState configurada en un directorio temporal."""
    state = JellyfishState()
    state.active_project = temp_project_dir
    return state


@pytest.fixture
def mock_llm_response():
    """Retorna una función helper para simular respuestas del motor LLM."""
    def _mock_response(content="Respuesta simulada del motor LLM"):
        mock = MagicMock()
        mock.return_value = content
        return mock
    return _mock_response

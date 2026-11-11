"""Skill: Narrative Void Detection — Detección de Vacíos y Personajes Desconectados."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class NarrativeVoidSkill(BaseSkill):
    """Análisis topológico y dramático para detectar vacíos de trama y entidades aisladas en el grafo."""

    name = "Narrative Void Detection"
    agency = "Creative"
    role = "@narrative_architect"
    keywords = [
        "vacíos narrativos", "vacios narrativos", "personajes aislados",
        "facciones olvidadas", "subtramas", "vacío dramático", "conexiones perdidas",
        "entidades periféricas", "fricción latente"
    ]

    def get_instructions(self) -> str:
        return """## Detección de Vacíos Narrativos y Entidades Periféricas

**Agencia:** Creative
**Rol Sugerido:** @narrative_architect

## Objetivo de la Skill
Analizar el grafo relacional y el manuscrito para descubrir oportunidades dramáticas desaprovechadas: personajes con solo 1 conexión que podrían detonar subtramas ricas, o facciones antagónicas que nunca han interactuado directamente.

## Metodología de Razonamiento (Paso a Paso)
1. **Identificación de Nodos Satélite**:
   - Detecta personajes con grado de conectividad bajo (<= 1 enlace) pero con gran potencial biográfico.
2. **Puentes de Conflicto Inexplorados**:
   - ¿Qué pasaría si el personaje A (leal a la corona) cruza caminos con el contrabandista B que solo habla con un tabernero?
3. **Facciones Silentes**:
   - Grupos de poder establecidos en el trasfondo pero que no tienen presencia activa en los capítulos del manuscrito.
4. **Propuestas de Puentes Narrativos**:
   - Diseña de 2 a 3 escenas puente concretas para entrelazar las subtramas dispersas en el nudo central.
"""

    def execute(self, params=None, **kwargs) -> Any:
        from core.escriba_engine import execute_escriba_task
        state = kwargs.get("state")
        text = kwargs.get("text") or (params.get("text") if isinstance(params, dict) else "")
        extra_params = kwargs.get("extra_params") or (params.get("extra_params") if isinstance(params, dict) else {})
        return execute_escriba_task("suggest_voids", text, state, extra_params=extra_params)

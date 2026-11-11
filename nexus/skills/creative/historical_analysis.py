"""Skill: Historical & Geopolitical Analysis — Coherencia Temporal y Dinámicas de Poder."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class HistoricalAnalysisSkill(BaseSkill):
    """Análisis exhaustivo de anacronismos, coherencia histórica/geopolítica y tensiones socioeconómicas."""

    name = "Historical & Geopolitical Analysis"
    agency = "Creative"
    role = "@worldbuilding_historian"
    keywords = [
        "análisis histórico", "analisis historico", "geopolítica", "geopolitica",
        "anacronismo", "coherencia temporal", "dinámicas de poder", "sistemas de creencias",
        "estratificación social", "monopolio de recursos"
    ]

    def get_instructions(self) -> str:
        return """## Análisis Histórico, Geopolítico y Coherencia de Mundo

**Agencia:** Creative
**Rol Sugerido:** @worldbuilding_historian

## Objetivo de la Skill
Someter la trama y el worldbuilding a una prueba de tensión de plausibilidad histórica y geopolítica. Examina el monopolio de la violencia, la economía de escasez y los anacronismos socioculturales o tecnológicos.

## Metodología de Razonamiento (Paso a Paso)
1. **Lente de Plausibilidad Material**:
   - ¿De dónde provienen los suministros, metales y comida que sostienen a las facciones en guerra?
2. **Lente de Poder y Cohesión**:
   - ¿Qué incentivo tangible mantiene leales a los vasallos o subordinados frente al riesgo de muerte?
3. **Lente de Anacronismo Mental**:
   - Evita imponer valores contemporáneos del siglo XXI sobre sociedades medievales o arcaicas sin justificación contextual.
4. **Fricción Ideológica y Fe**:
   - Cómo influyen las religiones o dogmas en las decisiones políticas de los gobernantes.
"""

    def execute(self, params=None, **kwargs) -> Any:
        from core.escriba_engine import execute_escriba_task
        state = kwargs.get("state")
        text = kwargs.get("text") or (params.get("text") if isinstance(params, dict) else "")
        extra_params = kwargs.get("extra_params") or (params.get("extra_params") if isinstance(params, dict) else {})
        return execute_escriba_task("historical_analysis", text, state, extra_params=extra_params)

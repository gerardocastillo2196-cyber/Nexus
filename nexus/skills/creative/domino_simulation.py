"""Skill: Domino Simulation — Modelado de Consecuencias Causales y Efecto Dominó en la Trama."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class DominoSimulationSkill(BaseSkill):
    """Simulación táctica y causal de alteraciones dramáticas y ruptura de alianzas (What-If Engine)."""

    name = "Domino Simulation"
    agency = "Creative"
    role = "@narrative_architect"
    keywords = [
        "domino", "what-if", "efecto dominó", "efecto domino",
        "ruptura de alianzas", "caída de facción", "vacío de poder",
        "alteración causal", "consecuencias imprevistas", "punto de quiebre"
    ]

    def get_instructions(self) -> str:
        return """## Motor de Simulación de Efecto Dominó (What-If Engine)

**Agencia:** Creative
**Rol Sugerido:** @narrative_architect

## Objetivo de la Skill
Modela de forma rigurosa la alteración de una variable crítica (muerte, traición, revelación de secreto, colapso de una facción) sobre el balance de poder del universo ficticio. Proyecta las ondas expansivas inmediatas, intermedias y a largo plazo evitando resoluciones simplistas.

## Metodología de Razonamiento (Paso a Paso)
1. **Identificación del Vértice Alterado**: Define la entidad núcleo y el evento disruptivo.
2. **Impacto Inmediato (Onda 1 — 24-48 horas)**:
   - ¿Qué alianza o tratado se rompe al instante?
   - ¿Quién asume el control provisional o intenta llenar el vacío?
   - ¿Qué reacción instintiva toman los adversarios directos?
3. **Escalada Institucional y Faccional (Onda 2 — Semanas siguientes)**:
   - Reubicación de tropas, congelamiento de rutas comerciales o cismas religiosos.
   - Polarización de facciones neutrales obligadas a elegir bando.
4. **Reconfiguración Sistémica (Onda 3 — Consecuencias irreversibles)**:
   - Nuevas leyes marciales, surgimiento de líderes extremistas o guerras abiertas.
5. **Recomendación de Escena**: Diseña el momento dramático clave donde el lector debe experimentar el impacto en primera persona.

## Anti-Patrones a Evitar
- 'Efecto burbuja': Que un evento catastrófico solo afecte al protagonista mientras el resto del mundo sigue idéntico.
- Resoluciones milagrosas: Que una alianza rota se arregle mediante una charla casual sin costo político real.
- Falta de fricción interna: Asumir que toda una facción actúa de forma monolítica sin disidentes internos.
"""

    def execute(self, params=None, **kwargs) -> Any:
        from core.escriba_engine import execute_escriba_task
        state = kwargs.get("state")
        text = kwargs.get("text") or (params.get("text") if isinstance(params, dict) else "")
        extra_params = kwargs.get("extra_params") or (params.get("extra_params") if isinstance(params, dict) else {})
        return execute_escriba_task("simulate_domino", text, state, extra_params=extra_params)

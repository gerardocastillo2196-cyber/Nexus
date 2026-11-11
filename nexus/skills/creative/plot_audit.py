"""Skill: Plot Audit — Auditoría Literaria y Supervisión de Continuidad."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class PlotAuditSkill(BaseSkill):
    """Auditoría de consistencia de trama, anacronismos, promesas no cumplidas y arcos inconclusos."""

    name = "Plot Audit"
    agency = "Creative"
    role = "@continuity_editor"
    keywords = [
        "auditoría", "auditoria", "continuidad", "trama", "hueco de guion",
        "plot hole", "inconsistencia", "promesa narrativa", "chekhov", "arco de personaje"
    ]

    def get_instructions(self) -> str:
        return """## Auditor Literario y Supervisor de Continuidad (Plot Audit)

**Agencia:** Creative
**Rol Sugerido:** @continuity_editor

## Objetivo de la Skill
Inspeccionar el manuscrito para detectar agujeros de guion, teletransportación de personajes, promesas de trama abandonadas (armas de Chéjov no disparadas) y contradicciones de reglas del mundo (*worldbuilding rules*).

## Metodología de Razonamiento (Paso a Paso)
1. **Auditoría Espaciotemporal**:
   - Calcula distancias recorridas y tiempos de viaje (evitar personajes que cruzan un reino en 2 horas a caballo).
   - Verifica sincronía: si dos eventos ocurren simultáneamente, comprueba la línea de tiempo compartida.
2. **Inventario de Promesas Narrativas**:
   - Rastrea enigmas planteados en capítulos iniciales y verifica si han recibido pago o desarrollo.
   - Detecta objetos especiales introducidos que luego desaparecen del inventario del personaje.
3. **Coherencia de Arcos y Motivaciones**:
   - ¿Actúa el personaje fiel a sus principios o cambia de personalidad abruptamente solo para forzar una escena?
4. **Dictamen de Continuidad**:
   - Entrega un informe clasificado en: Severidad Alta (quiebres lógicos), Moderada (ritmo/distracción) y Sugerencias de Pulido.

## Anti-Patrones a Evitar
- 'Deus Ex Machina': Soluciones mágicas de último minuto sin establecimiento previo de reglas.
- Personajes de adorno: Introducir un personaje con gran fanfarria para luego no darle ningún peso dramático.
- Amnesia de heridas: Personajes gravemente heridos que en la siguiente escena luchan como si nada hubiera ocurrido.
"""

    def execute(self, params=None, **kwargs) -> Any:
        from core.escriba_engine import execute_escriba_task
        state = kwargs.get("state")
        text = kwargs.get("text") or (params.get("text") if isinstance(params, dict) else "")
        extra_params = kwargs.get("extra_params") or (params.get("extra_params") if isinstance(params, dict) else {})
        return execute_escriba_task("plot_audit", text, state, extra_params=extra_params)

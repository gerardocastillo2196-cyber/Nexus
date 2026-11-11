"""Skill: Character Debate Simulation — Fricción Dialéctica y Diálogo en Escena."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class CharacterDebateSkill(BaseSkill):
    """Simulación dialéctica de alta tensión y confrontación moral entre personajes basada en sus arquetipos y facciones."""

    name = "Character Debate Simulation"
    agency = "Creative"
    role = "@dramaturge"
    keywords = [
        "debate de personajes", "debate personajes", "fricción dialéctica",
        "confrontación moral", "diálogo alternado", "diálogo en escena",
        "subtexto de personajes", "choque de convicciones"
    ]

    def get_instructions(self) -> str:
        return """## Simulación de Debate y Fricción entre Personajes

**Agencia:** Creative
**Rol Sugerido:** @dramaturge

## Objetivo de la Skill
Recrear un enfrentamiento dialéctico visceral y auténtico entre dos o más personajes frente a una encrucijada moral, manteniendo fidelidad absoluta a la biografía, sesgos ideológicos y arquetipos de cada uno.

## Metodología de Razonamiento (Paso a Paso)
1. **Contraste de Posturas Nucleares**:
   - Define qué valor no negociable defiende cada personaje (ej. Supervivencia pragmática vs. Integridad moral).
2. **Subtexto y Lenguaje Corporal**:
   - Cada réplica debe intercalar acotaciones entre paréntesis con micro-gestos y tensión física contenida.
3. **Escalada Dramática**:
   - El diálogo no debe ser un intercambio académico: debe haber ataques a las vulnerabilidades íntimas del interlocutor.
4. **Resolución Inconclusa / Fractura**:
   - Evita acuerdos fáciles o moralinas: la escena debe dejar una huella dramática que impulse el conflicto del capítulo.
"""

    def execute(self, params=None, **kwargs) -> Any:
        from core.escriba_engine import run_character_debate
        state = kwargs.get("state")
        dilemma = kwargs.get("dilemma") or (params.get("dilemma") if isinstance(params, dict) else "Dilema de convicciones")
        char_a_id = kwargs.get("char_a_id") or (params.get("char_a_id") if isinstance(params, dict) else "Personaje_A")
        char_b_id = kwargs.get("char_b_id") or (params.get("char_b_id") if isinstance(params, dict) else "Personaje_B")
        return run_character_debate(state, dilemma, char_a_id, char_b_id)

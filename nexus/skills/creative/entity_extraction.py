"""Skill: Entity & Lore Extraction — Extracción de Entidades y Grafo Semántico del Manuscrito."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class EntityExtractionSkill(BaseSkill):
    """Extracción heurística y semántica de entidades, facciones, ubicaciones y relaciones desde el manuscrito."""

    name = "Entity & Lore Extraction"
    agency = "Creative"
    role = "@lore_archivist"
    keywords = [
        "extraer entidades", "grafo semántico", "extracción de personajes",
        "ner narrativo", "detectar personajes", "analizar manuscrito",
        "árbol genealógico", "relaciones entre entidades"
    ]

    def get_instructions(self) -> str:
        return """## Extracción de Entidades y Construcción del Grafo Semántico

**Agencia:** Creative
**Rol Sugerido:** @lore_archivist

## Objetivo de la Skill
Leer texto narrativo continuo e identificar automáticamente las entidades clave (personajes, facciones, lugares y eventos) asignándoles arquetipos, roles y mapeando sus relaciones dirigidas con intensidad y etiqueta.

## Metodología de Razonamiento (Paso a Paso)
1. **Detección de Personajes**:
   - Nombres propios, títulos honoríficos (Lord, Capitán, Doña, etc.) y sujetos de diálogo recurrente.
2. **Identificación de Facciones y Colectivos**:
   - Casas nobles, gremios, sindicatos, órdenes místicas o ejércitos.
3. **Mapeo de Vínculos Relacionales**:
   - Clasificar la relación: `aliado_de`, `enemigo_de`, `subordinado_a`, `leal_a`, `traidor_a`.
   - Asignar intensidad del vínculo (1 a 5) y dirección clara.
4. **Validación de Unicidad**:
   - Unificar apodos y nombres completos bajo una sola entidad canónica.
"""

    def execute(self, params=None, **kwargs) -> Any:
        from core.escriba_engine import extract_graph_from_manuscript
        state = kwargs.get("state")
        text = kwargs.get("text") or (params.get("text") if isinstance(params, dict) else "")
        project_id = kwargs.get("project_id") or (params.get("project_id") if isinstance(params, dict) else None)
        return extract_graph_from_manuscript(state, text, project_id=project_id)

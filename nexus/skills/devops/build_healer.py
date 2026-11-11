"""Skill: Build Healer — Diagnóstico y Auto-Reparación de Errores de Compilación y Sintaxis."""
from typing import Any, Dict
from core.skills.base import BaseSkill


class BuildHealerSkill(BaseSkill):
    """Diagnóstico, sanación y reparación automática de fallos de compilación, sintaxis y ejecución."""

    name = "Build Healer"
    agency = "DevOps"
    role = "@devops_engineer"
    keywords = [
        "build fail", "syntax error", "compilación", "compilacion",
        "linter error", "error de compilación", "sanar build", "fix error",
        "type error", "traceback"
    ]

    def get_instructions(self) -> str:
        return """## Diagnóstico y Auto-Reparación de Builds (Build Healer)

**Agencia:** DevOps
**Rol Sugerido:** @devops_engineer

## Objetivo de la Skill
Analizar salidas de error de compilación (Node.js, TypeScript, Python, Rust, Docker) o trazas de excepción, identificar la causa raíz exacta y proponer una solución quirúrgica sin romper código circundante.

## Metodología de Razonamiento (Paso a Paso)
1. **Aislamiento del Traceback**:
   - Identificar el archivo exacto, número de línea y tipo de error (`SyntaxError`, `TypeError`, `ModuleNotFoundError`, etc.).
2. **Chequeo de Entorno y Dependencias**:
   - Verificar si falta una dependencia en `package.json` / `requirements.txt` o si se requiere un entorno virtual específico.
3. **Parche Quirúrgico Mínimo**:
   - Corregir el fallo modificando únicamente el bloque defectuoso, preservando contratos y tipados previos.
4. **Validación de Sanación**:
   - Proponer el comando de prueba inmediato (`pytest`, `npm test`, `py_compile`) para verificar que el build pasa a verde.
"""

    def execute(self, params=None, **kwargs) -> Any:
        try:
            from core.orchestration.build_healer import BuildHealer
            orchestrator = kwargs.get("orchestrator")
            healer = BuildHealer(orchestrator)
            error_log = kwargs.get("error_log") or (params.get("error_log") if isinstance(params, dict) else "")
            return healer.heal(error_log)
        except Exception as e:
            return {"status": "error", "message": f"BuildHealer error: {e}"}

"""core.agents.sandbox — Executor aislado para hooks de agentes.

Ejecuta código Python en un subproceso independiente con:
- Timeout configurable (default 30s)
- Entorno limpio (sin API keys ni variables sensibles)
- Protección de directorios del sistema
- Python en modo aislado (-I)

Reutiliza la filosofía de aislamiento de core/plugin_manager.py
pero orientado a los hooks post_execute() de los agentes.

Referencia de acoplamiento:
    - core/orchestration/task_runner.py → invoca run_in_sandbox() para hooks
    - agents/qa_engineer.py → usa run_in_sandbox() en post_execute()
"""

import json
import logging
import os
import subprocess
import sys
import tempfile

logger = logging.getLogger("jellyfish.agents.sandbox")

# Timeout máximo para cualquier hook de agente
_HOOK_TIMEOUT_S = 30

# Directorios que un hook NUNCA puede modificar
_PROTECTED_PATHS = frozenset({"/", "/home", "/etc", "/usr", "/bin", "/var", "/tmp", "/root"})


def run_in_sandbox(
    code: str,
    working_dir: str,
    timeout: int = _HOOK_TIMEOUT_S,
) -> dict:
    """Ejecuta código Python en un subproceso aislado con timeout.

    Args:
        code: Código Python a ejecutar.
        working_dir: Directorio de trabajo (raíz del proyecto).
        timeout: Tiempo máximo de ejecución en segundos.

    Returns:
        {"ok": bool, "result": str, "error": str}
    """
    # Validar que working_dir no sea una ruta protegida
    real_dir = os.path.realpath(working_dir)
    home_dir = os.path.expanduser("~")

    if real_dir in _PROTECTED_PATHS or real_dir == home_dir:
        return {
            "ok": False,
            "result": "",
            "error": f"Directorio protegido, ejecución bloqueada: {real_dir}",
        }

    if not os.path.isdir(real_dir):
        return {
            "ok": False,
            "result": "",
            "error": f"Directorio no existe: {real_dir}",
        }

    # Escribir el wrapper a un archivo temporal dentro del proyecto
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix="_jf_sandbox.py",
            delete=False,
            encoding="utf-8",
            dir=real_dir,
        ) as tmp:
            # Wrapper que captura stdout y excepciones
            wrapper = (
                "import json, sys, os\n"
                f"os.chdir({repr(real_dir)})\n"
                "try:\n"
                f"    exec({repr(code)})\n"
                '    print(json.dumps({"ok": True, "result": "Ejecución exitosa"}))\n'
                "except Exception as e:\n"
                '    print(json.dumps({"ok": False, "error": str(e)}))\n'
            )
            tmp.write(wrapper)
            tmp_path = tmp.name
    except OSError as e:
        return {"ok": False, "result": "", "error": f"Error creando archivo temporal: {e}"}

    try:
        # Entorno limpio: sin API keys ni variables sensibles
        clean_env = {
            "PATH": os.getenv("PATH", "/usr/bin:/bin"),
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONNOUSERSITE": "1",
            "HOME": real_dir,
        }
        for key in ("LANG", "LC_ALL", "TERM"):
            val = os.getenv(key)
            if val:
                clean_env[key] = val

        result = subprocess.run(
            [sys.executable, "-I", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=real_dir,
            env=clean_env,
        )

        stdout = result.stdout.strip()
        if stdout:
            # Buscar la última línea JSON (el wrapper puede haber producido output previo)
            for line in reversed(stdout.splitlines()):
                line = line.strip()
                if line.startswith("{"):
                    try:
                        return json.loads(line)
                    except json.JSONDecodeError:
                        continue
            return {"ok": True, "result": stdout[:500], "error": ""}

        stderr = result.stderr.strip()
        return {
            "ok": False,
            "result": "",
            "error": stderr[:500] if stderr else "Sin output",
        }

    except subprocess.TimeoutExpired:
        logger.warning("Sandbox timeout (%ds) para código en %s", timeout, real_dir)
        return {"ok": False, "result": "", "error": f"Timeout ({timeout}s)"}

    except Exception as e:
        logger.error("Error en sandbox: %s", e)
        return {"ok": False, "result": "", "error": str(e)}

    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


# ─── MÉTODOS DE ABLACIÓN Y SEGURIDAD FASE 1 (v7.0) ───

import re
import shlex

_BLOCK_PATTERNS = [
    re.compile(r"\b(sudo|su|doas)\b", re.IGNORECASE),
    re.compile(r">\s*/(?:root|etc|usr|boot|sys|proc|dev|home)\b", re.IGNORECASE),
]

def is_command_safe(cmd_str: str) -> tuple[bool, str]:
    """Verifica si un comando intenta escalar privilegios o escribir en directorios del sistema host.
    
    Returns:
        (True, "") si es seguro, (False, patrón) si es potencialmente peligroso.
    """
    for pattern in _BLOCK_PATTERNS:
        if pattern.search(cmd_str):
            return False, pattern.pattern
    return True, ""

def run_subprocess(cmd: list[str] | str, **kwargs) -> subprocess.CompletedProcess:
    """Sustituto seguro para subprocess.run que valida privilegios antes de ejecutar en el host."""
    cmd_str = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
    
    is_safe, matched_pattern = is_command_safe(cmd_str)
    if not is_safe:
        logger.error("COMANDO EN SUBPROCESO BLOQUEADO POR SEGURIDAD: %s (Patrón: %s)", cmd_str, matched_pattern)
        return subprocess.CompletedProcess(
            args=cmd,
            returncode=-1,
            stdout="",
            stderr=f"[ALERTA] INCIDENTE DE SEGURIDAD: Comando bloqueado por políticas de Sandbox en el subproceso del DoD. Patrón detectado: {matched_pattern}"
        )
        
    return subprocess.run(cmd, **kwargs)

def run_terminal_command(command_str: str, state, **kwargs) -> str:
    """Envoltura de seguridad para run_terminal_command. Bloquea de inmediato comandos destructivos."""
    is_safe, matched_pattern = is_command_safe(command_str)
    if not is_safe:
        msg = (
            f"[ALERTA] INCIDENTE DE SEGURIDAD: Comando destructivo detectado y bloqueado automáticamente por el sandbox.\n"
            f"   Patrón de lista negra: {matched_pattern}\n"
            f"   Comando: {command_str[:150]}"
        )
        logger.error("COMANDO DE TERMINAL BLOQUEADO EN SANDBOX: %s (Patrón: %s)", command_str, matched_pattern)
        
        # Registrar en denied_commands en el estado para evitar loops infinitos
        if state is not None:
            if not hasattr(state, "denied_commands"):
                state.denied_commands = set()
            state.denied_commands.add(command_str)
            
        return msg
        
    # Si pasa la seguridad del sandbox, delegar al ejecutor de terminal real
    from core.terminal import run_terminal_command as real_run
    return real_run(command_str, state, **kwargs)


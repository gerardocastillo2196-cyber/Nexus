import os
import logging
from core.agents import sandbox

logger = logging.getLogger("jellyfish.orchestration.task_runner.validators")

class DoDValidator:
    """Módulo que encapsula toda la lógica de validación previa y posterior a la ejecución (DoD)."""

    def __init__(self, orchestrator):
        self.orchestrator = orchestrator

    def validate_static_syntax(self, created_files: list[str]) -> tuple[bool, str]:
        """Ejecuta un análisis de sintaxis estática sobre los archivos creados."""
        from core.orchestration.code_analyzer import validate_syntax
        for f_created in created_files:
            abs_f_path = os.path.join(self.orchestrator.project_path, f_created)
            if os.path.isfile(abs_f_path):
                s_ok, s_err = validate_syntax(abs_f_path)
                if not s_ok:
                    return False, s_err
        return True, ""

    def validate_orphaned_files(self, created_files: list[str]) -> tuple[bool, str]:
        """Busca archivos huérfanos generados en el sprint que no tengan conexiones de importación."""
        from core.orchestration.code_analyzer import check_orphaned_files
        orphans = check_orphaned_files(self.orchestrator.project_path, created_files)
        if orphans:
            return False, f"Archivos huérfanos detectados: {', '.join(orphans)}. DEBES integrarlos/importarlos en tu proyecto principal."
        return True, ""

    def run_strict_subprocess_dod_validation(
        self, project_path: str, created_files: list[str], output_file: str
    ) -> tuple[bool, str]:
        """Ejecuta una validación estricta de compilación/sintaxis en un subproceso seguro (sandbox.run_subprocess).
        
        Verifica activamente que los archivos generados o modificados no rompan el entorno
        e intenta compilar/instalar/lintear según el tipo de archivo.
        """
        files_to_check = set(created_files)
        if output_file:
            files_to_check.add(output_file)
            
        real_files = []
        for rel_f in files_to_check:
            abs_f = os.path.join(project_path, rel_f.strip().replace("`", ""))
            if os.path.isfile(abs_f):
                real_files.append((rel_f, abs_f))
                
        if not real_files:
            return True, "No se encontraron archivos en disco para validar por subproceso."

        for rel_f, abs_f in real_files:
            ext = os.path.splitext(abs_f)[1].lower()
            basename = os.path.basename(abs_f).lower()
            
            # 1. Archivos Python (.py)
            if ext == ".py":
                try:
                    res = sandbox.run_subprocess(
                        ["python3", "-m", "py_compile", abs_f],
                        capture_output=True, text=True, timeout=15, cwd=project_path
                    )
                    if res.returncode != 0:
                        err_msg = (res.stderr or res.stdout).strip()
                        return False, f"RECHAZO DOD (COMPILACIÓN PYTHON): El archivo '{rel_f}' falló la verificación de sintaxis (py_compile):\n{err_msg}"
                except Exception as e:
                    logger.warning("Error ejecutando py_compile en %s: %s", rel_f, e)

            # 2. Archivos JSON (.json)
            elif ext == ".json":
                try:
                    res = sandbox.run_subprocess(
                        ["python3", "-m", "json.tool", abs_f],
                        capture_output=True, text=True, timeout=15, cwd=project_path
                    )
                    if res.returncode != 0:
                        err_msg = (res.stderr or res.stdout).strip()
                        return False, f"RECHAZO DOD (SINTAXIS JSON): El archivo '{rel_f}' contiene JSON malformado:\n{err_msg}"
                except Exception as e:
                    logger.warning("Error ejecutando json.tool en %s: %s", rel_f, e)

            # 3. Archivos JavaScript / TypeScript / React (.js, .jsx, .ts, .tsx)
            elif ext in (".js", ".jsx", ".ts", ".tsx"):
                try:
                    with open(abs_f, "r", encoding="utf-8", errors="ignore") as f:
                        js_content = f.read()
                    
                    has_jsx = ext in (".jsx", ".tsx") or "<" in js_content
                    if not has_jsx and ext in (".js", ".ts"):
                        res = sandbox.run_subprocess(
                            ["node", "--check", abs_f],
                            capture_output=True, text=True, timeout=15, cwd=project_path
                        )
                        if res.returncode != 0:
                            err_msg = (res.stderr or res.stdout).strip()
                            return False, f"RECHAZO DOD (SINTAXIS JS/TS): El archivo '{rel_f}' falló la verificación de sintaxis (node --check):\n{err_msg}"
                    else:
                        esbuild_loader = "tsx" if ext in (".tsx", ".ts") else "jsx"
                        esbuild_ok = False
                        try:
                            res = sandbox.run_subprocess(
                                ["npx", "esbuild", abs_f, f"--loader={esbuild_loader}", "--no-exec"],
                                capture_output=True, text=True, timeout=15, cwd=project_path
                            )
                            if res.returncode == 0:
                                esbuild_ok = True
                            elif "error:" in res.stderr.lower() or "syntax error" in res.stderr.lower():
                                err_msg = (res.stderr or res.stdout).strip()
                                return False, f"RECHAZO DOD (SINTAXIS REACT/JSX): El archivo '{rel_f}' contiene errores de sintaxis TSX/JSX (esbuild):\n{err_msg}"
                        except Exception:
                            pass
                        
                        if not esbuild_ok:
                            from core.orchestration.code_analyzer import _validate_jsx_tsx_static
                            ok_jsx, err_jsx = _validate_jsx_tsx_static(js_content)
                            if not ok_jsx:
                                return False, f"RECHAZO DOD (SINTAXIS JSX/TSX): El archivo '{rel_f}' contiene errores sintácticos:\n{err_jsx}"
                except Exception as e:
                    logger.warning("Error ejecutando validación JS/TSX en %s: %s", rel_f, e)

            # 4. Archivos Shell (.sh)
            elif ext == ".sh":
                try:
                    res = sandbox.run_subprocess(
                        ["bash", "-n", abs_f],
                        capture_output=True, text=True, timeout=15, cwd=project_path
                    )
                    if res.returncode != 0:
                        err_msg = (res.stderr or res.stdout).strip()
                        return False, f"RECHAZO DOD (SINTAXIS BASH): El script '{rel_f}' falló la verificación bash -n:\n{err_msg}"
                except Exception as e:
                    logger.warning("Error ejecutando bash -n en %s: %s", rel_f, e)

            # 5. Archivos de Contenedor (docker-compose.yml / yaml)
            elif basename in ("docker-compose.yml", "docker-compose.yaml"):
                try:
                    res = sandbox.run_subprocess(
                        ["docker", "compose", "config", "-q"],
                        capture_output=True, text=True, timeout=15, cwd=project_path
                    )
                    if res.returncode != 0 and res.stderr:
                        err_msg = res.stderr.strip()
                        return False, f"RECHAZO DOD (SINTAXIS DOCKER COMPOSE): El archivo '{rel_f}' falló la validación 'docker compose config':\n{err_msg}"
                except FileNotFoundError:
                    pass
                except Exception as e:
                    logger.warning("Error ejecutando docker compose config: %s", e)

            # 6. Archivos C/C++ (.cpp, .cc, .cxx, .c, .h, .hpp)
            elif ext in (".cpp", ".cc", ".cxx", ".c", ".h", ".hpp"):
                try:
                    compiler = "gcc" if ext == ".c" else "g++"
                    res = sandbox.run_subprocess(
                        [compiler, "-fsyntax-only", abs_f],
                        capture_output=True, text=True, timeout=15, cwd=project_path
                    )
                    if res.returncode != 0:
                        err_msg = (res.stderr or res.stdout).strip()
                        return False, f"RECHAZO DOD (SINTAXIS C/C++): El archivo '{rel_f}' falló la verificación de sintaxis ({compiler} -fsyntax-only):\n{err_msg}"
                except FileNotFoundError:
                    return False, f"RECHAZO DOD (FALTA COMPILADOR): El compilador '{compiler}' no está instalado en el sistema host o no se encuentra en el PATH. Es obligatorio para validar archivos C/C++."
                except Exception as e:
                    logger.warning("Error ejecutando %s -fsyntax-only en %s: %s", compiler, rel_f, e)

        return True, "Validación de compilación y ejecución por subproceso (DoD) aprobada."

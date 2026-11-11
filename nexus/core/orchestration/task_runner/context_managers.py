import os
import logging
from rich.console import Console

logger = logging.getLogger("jellyfish.orchestration.task_runner.context_managers")
console = Console()

class TaskContextManager:
    """Manejador encargado de preparar el entorno transaccional (Git) y reconciliar componentes del entorno (Docker)."""

    def __init__(self, orchestrator):
        self.orchestrator = orchestrator

    def reconcile_missing_docker_context_files(self, created_files: list[str]) -> None:
        """
        Escanea los Dockerfiles recién creados para buscar instrucciones COPY/ADD.
        Si alguna instrucción copia un archivo local que no existe en el contexto de construcción,
        crea un archivo placeholder mínimo para evitar fallos de compilación prematuros en Sprint 0.
        """
        for path in created_files:
            if "dockerfile" in path.lower():
                abs_path = os.path.join(self.orchestrator.project_path, path)
                if not os.path.isfile(abs_path):
                    continue
                try:
                    with open(abs_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                    
                    dockerfile_dir = os.path.dirname(abs_path)
                    for line in lines:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if line.upper().startswith("COPY ") or line.upper().startswith("ADD "):
                            parts = line.split()
                            if len(parts) < 3:
                                continue
                            
                            has_from = False
                            sources = []
                            for part in parts[1:-1]:
                                if part.startswith("--from="):
                                    has_from = True
                                elif part.startswith("--"):
                                    continue
                                else:
                                    sources.append(part)
                            
                            if has_from:
                                continue
                                
                            for src in sources:
                                src_clean = src.replace("*", "").replace("?", "")
                                if not src_clean or src_clean in (".", "/"):
                                    continue
                                
                                target_file_path = os.path.join(dockerfile_dir, src_clean)
                                if not os.path.exists(target_file_path):
                                    os.makedirs(os.path.dirname(target_file_path), exist_ok=True)
                                    if src_clean.endswith("package.json"):
                                        with open(target_file_path, "w", encoding="utf-8") as pf:
                                            pf.write('{\n  "name": "placeholder",\n  "version": "1.0.0"\n}\n')
                                    elif src_clean.endswith("pubspec.yaml"):
                                        with open(target_file_path, "w", encoding="utf-8") as pf:
                                            pf.write("name: placeholder\nversion: 1.0.0\nenvironment:\n  sdk: '>=3.0.0 <4.0.0'\n")
                                    elif src_clean.endswith("requirements.txt"):
                                        with open(target_file_path, "w", encoding="utf-8") as pf:
                                            pf.write("# Placeholder base\n")
                                    else:
                                        with open(target_file_path, "w", encoding="utf-8") as pf:
                                            pf.write("")
                                    logger.info("Auto-creado archivo de contexto Docker faltante: %s", target_file_path)
                                    console.print(f"       [ACCION] Auto-creado placeholder requerido para Docker: [dim]{src_clean}[/dim]")
                except Exception as e:
                    logger.error("Error al reconciliar archivos de contexto Docker: %s", e)

    def start_transaction(self, task_id: str) -> tuple[bool, str]:
        """Inicia una transacción de Git (micro-branch) si el repositorio está configurado."""
        if self.orchestrator._is_git_repo():
            use_microbranch, original_branch = self.orchestrator._git_start_task_branch(task_id)
            return use_microbranch, original_branch
        else:
            snapshot_created = self.orchestrator._git_commit_snapshot(task_id)
            return False, snapshot_created

    def rollback_transaction(self, task_id: str, use_microbranch: bool, original_branch_or_snapshot: str, snapshot_created: bool) -> None:
        """Revierte los cambios locales o destruye el micro-branch en caso de fallo de DoD."""
        if use_microbranch:
            self.orchestrator._git_end_task_branch(task_id, original_branch_or_snapshot, success=False)
        else:
            self.orchestrator._git_rollback(task_id, snapshot_created)

    def commit_transaction(self, task_id: str, use_microbranch: bool, original_branch: str) -> None:
        """Valida y consolida los cambios de la transacción de Git exitosamente."""
        if use_microbranch:
            self.orchestrator._git_end_task_branch(task_id, original_branch, success=True)

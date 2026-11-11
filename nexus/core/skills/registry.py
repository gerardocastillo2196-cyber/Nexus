"""core.skills.registry — Registro dinámico de skills Python para Jellyfish OS.

Escanea recursivamente la carpeta skills/ (y sus subdirectorios)
en busca de archivos .py que contengan subclases de BaseSkill.

Referencia de acoplamiento:
    - core/state.py → refresh_static_context() usa SkillRegistry para inyectar skills
    - core/orchestration/task_runner.py → filtra skills por keywords vía matches_task()
    - plugins/integration/skill_loader.py → consulta el registry
"""

import os
import sys
import importlib.util
import inspect
import logging
from typing import Dict, List, Optional, Type

from core.skills.base import BaseSkill

logger = logging.getLogger("jellyfish.skills.registry")


class SkillRegistry:
    """Registro centralizado de skills Python para Nexus OS / Jellyfish OS.

    Escanea recursivamente subdirectorios (development/, devops/, frontend/, creative/, etc.)
    e indexa las skills tanto por nombre canónico como por slugs y alias.
    """

    _registry: Dict[str, Type[BaseSkill]] = {}
    _canonical_registry: Dict[str, Type[BaseSkill]] = {}
    _scanned: bool = False

    @classmethod
    def scan(cls, skills_dir: str) -> int:
        """Escanea recursivamente skills_dir/ y registra clases BaseSkill.

        Args:
            skills_dir: Ruta absoluta a la carpeta skills/.

        Returns:
            Número de skills Python únicas registradas.
        """
        if not os.path.isdir(skills_dir):
            logger.warning("Directorio de skills no encontrado: %s", skills_dir)
            return 0

        discovered = 0

        for root, _, files in os.walk(skills_dir):
            for filename in sorted(files):
                if not filename.endswith(".py") or filename.startswith("__"):
                    continue

                filepath = os.path.join(root, filename)
                module_name = filename[:-3]

                # Nombre cualificado único para evitar colisiones
                relative = os.path.relpath(filepath, skills_dir)
                qualified = f"_jellyfish_skill_{relative.replace(os.sep, '_')[:-3]}"

                try:
                    spec = importlib.util.spec_from_file_location(
                        qualified, filepath
                    )
                    if spec is None or spec.loader is None:
                        continue
                    module = importlib.util.module_from_spec(spec)
                    sys.modules[qualified] = module
                    spec.loader.exec_module(module)

                    for attr_name, obj in inspect.getmembers(module, inspect.isclass):
                        if (
                            issubclass(obj, BaseSkill)
                            and obj is not BaseSkill
                            and getattr(obj, "name", None)  # Debe tener nombre definido
                        ):
                            # Inyectar metadata de archivo en la clase
                            setattr(obj, "_filepath", filepath)
                            setattr(obj, "_slug", module_name)

                            canonical_key = obj.name.strip()
                            cls._canonical_registry[canonical_key] = obj

                            # Mapear múltiples alias para que la búsqueda nunca falle
                            slug_key = module_name.lower().strip()
                            name_lower = obj.name.lower().strip()
                            agency_lower = (obj.agency or "default").lower().strip()

                            cls._registry[name_lower] = obj
                            cls._registry[name_lower.replace(" ", "_")] = obj
                            cls._registry[slug_key] = obj
                            cls._registry[slug_key.replace("_", " ")] = obj
                            cls._registry[f"{agency_lower}:{slug_key}"] = obj
                            cls._registry[f"{agency_lower}:{name_lower}"] = obj
                            cls._registry[f"{agency_lower}/{slug_key}"] = obj

                            discovered += 1
                            logger.info(
                                "Skill Python registrada: '%s' (%s) [agencia: %s]",
                                obj.name,
                                obj.__name__,
                                obj.agency,
                            )

                except Exception as e:
                    logger.error(
                        "Error cargando skill Python '%s': %s", filepath, e
                    )

        cls._scanned = True
        return len(cls._canonical_registry)

    @classmethod
    def get(cls, name: str) -> Optional[BaseSkill]:
        """Retorna una instancia de la skill por nombre, slug o alias."""
        if not name:
            return None
        key = name.lower().strip()
        
        # 1. Búsqueda directa o normalizada
        skill_cls = cls._registry.get(key)
        if not skill_cls:
            skill_cls = cls._registry.get(key.replace("_", " "))
        if not skill_cls:
            skill_cls = cls._registry.get(key.replace(" ", "_"))
        if not skill_cls and ":" in key:
            sub = key.split(":", 1)[1]
            skill_cls = cls._registry.get(sub) or cls._registry.get(sub.replace("_", " "))
        if not skill_cls and "/" in key:
            sub = key.split("/", 1)[1]
            skill_cls = cls._registry.get(sub) or cls._registry.get(sub.replace("_", " "))
        if not skill_cls:
            # Buscar en canónicos sin importar mayúsculas
            for c_name, c_cls in cls._canonical_registry.items():
                if c_name.lower() == key or getattr(c_cls, "_slug", "").lower() == key:
                    skill_cls = c_cls
                    break

        if skill_cls:
            return skill_cls()
        return None

    @classmethod
    def has(cls, name: str) -> bool:
        """Verifica si una skill Python está registrada."""
        return cls.get(name) is not None

    @classmethod
    def list_skills(cls) -> Dict[str, Type[BaseSkill]]:
        """Retorna el catálogo canónico deduplicado de skills registradas."""
        return dict(cls._canonical_registry)

    @classmethod
    def get_skill_info(cls, skill_cls_or_inst: Any) -> Dict[str, Any]:
        """Extrae la metadata completa de una skill."""
        inst = skill_cls_or_inst() if inspect.isclass(skill_cls_or_inst) else skill_cls_or_inst
        slug = getattr(inst, "_slug", inst.name.lower().replace(" ", "_"))
        agency = inst.agency or "Default"
        skill_id = f"{agency.lower()}:{slug}"
        has_exec = hasattr(inst, "execute") and inst.__class__.execute != BaseSkill.execute

        # Extraer descripción del docstring
        doc = inspect.getdoc(inst.__class__) or ""
        lines = [line.strip() for line in doc.splitlines() if line.strip()]
        desc = lines[0] if lines else f"Habilidad especializada para la agencia {agency}."

        # Determinar ecosistema (escriba, jellyfish, nexus)
        ecosystem = getattr(inst, "ecosystem", None)
        if not ecosystem:
            norm_agency = agency.lower().replace("_", " ")
            if norm_agency == "creative":
                ecosystem = "escriba"
            elif norm_agency in ["development", "devops", "frontend", "management"]:
                ecosystem = "jellyfish"
            elif norm_agency in ["research", "marketing", "legal & media", "legal media"]:
                ecosystem = "nexus"
            else:
                ecosystem = "nexus"

        return {
            "id": skill_id,
            "slug": slug,
            "name": inst.name,
            "agency": agency,
            "ecosystem": ecosystem,
            "role": inst.role,
            "keywords": inst.keywords or [],
            "description": desc,
            "has_execution": has_exec,
            "filepath": getattr(inst, "_filepath", "")
        }

    @classmethod
    def get_skills_for_task(
        cls, task_description: str, agency: str = ""
    ) -> List[BaseSkill]:
        """Retorna las instancias de skills relevantes para una tarea."""
        relevant = []
        for skill_cls in cls._canonical_registry.values():
            skill = skill_cls()
            # Filtrar por agencia si se especifica
            if agency and agency.lower() not in skill.agency.lower():
                continue
            # Filtrar por keywords
            if skill.matches_task(task_description):
                relevant.append(skill)
        return relevant

    @classmethod
    def clear(cls) -> None:
        """Limpia el registro (útil para testing o recargas)."""
        cls._registry.clear()
        cls._canonical_registry.clear()
        cls._scanned = False


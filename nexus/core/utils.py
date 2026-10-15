import os
import logging

logger = logging.getLogger("jellyfish.utils")

_read_cache = {}

def _safe_read(filepath: str) -> str:
    """Lee un archivo de forma segura con codificación UTF-8 y caché basado en mtime."""
    try:
        mtime = os.path.getmtime(filepath)
        cached = _read_cache.get(filepath)
        if cached and cached[0] == mtime:
            return cached[1]
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            _read_cache[filepath] = (mtime, content)
            return content
    except (OSError, IOError) as e:
        import errno
        if e.errno == errno.ENOENT:
            logger.debug("Archivo no encontrado (silenciado): %s", filepath)
        else:
            logger.warning("No se pudo leer %s: %s", filepath, e)
        return ""

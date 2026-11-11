"""jellyfish_web.py — Alias de compatibilidad hacia nexus.py para Nexus OS v7.0."""

import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
nexus_dir = os.path.join(os.path.dirname(base_dir), "nexus")
if os.path.isdir(nexus_dir) and nexus_dir not in sys.path:
    sys.path.insert(0, nexus_dir)

from nexus import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("nexus:app", host="127.0.0.1", port=8001, reload=True)


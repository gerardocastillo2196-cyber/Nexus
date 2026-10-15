"""nexus.py — Entorno Gráfico & Servidor Principal de Nexus OS v7.0.

Nexus OS v7.0 integra 3 motores en un ecosistema unificado:
1. NEXUS OS: Núcleo Conversacional Libre y Orquestador de la Interfaz Web.
2. ESCRIBA Engine: Motor de Arquitectura Narrativa, Marco Teórico/Histórico y Editor Canva.
3. JELLYFISH Engine: Motor Ágil Multi-Agente (Scrum, Sprints, Desarrollo de Software).
"""

import os
import sys
import logging
from logging.handlers import RotatingFileHandler

# Auto-detectar y usar el entorno virtual .venv del proyecto
base_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(base_dir)
venv_python = os.path.join(base_dir, ".venv", "bin", "python3")
if not os.path.exists(venv_python):
    venv_python = os.path.join(parent_dir, ".venv", "bin", "python3")

if os.path.exists(venv_python) and sys.executable != venv_python and not os.environ.get("JELLYFISH_VENV_ACTIVATED"):
    os.environ["JELLYFISH_VENV_ACTIVATED"] = "1"
    os.execv(venv_python, [venv_python] + sys.argv)

# Asegurar que el directorio raíz esté en el path
sys.path.insert(0, base_dir)

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Configuración de Logs del Servidor Nexus OS
logging.basicConfig(level=logging.WARNING, handlers=[
    RotatingFileHandler(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "nexus.log"),
        maxBytes=2*1024*1024, backupCount=1, encoding="utf-8"
    )
])
for noisy in ["chromadb", "opentelemetry", "urllib3", "dotenv.main", "httpx", "httpcore", "asyncio"]:
    logging.getLogger(noisy).setLevel(logging.ERROR)

from core.api import router as api_router
from core.nexus import get_nexus_info
from core.escriba import load_escriba_chapters
from core.jellyfish import ProjectOrchestrator
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Inicializar Aplicación FastAPI para Nexus OS v7.0 (3 en 1)
app = FastAPI(
    title="Nexus OS v7.0 (NEXUS + ESCRIBA + JELLYFISH)",
    description="Sistema Operativo IA 3 en 1: Chat Conversacional Libre, Motor Narrativo ESCRIBA y Motor Multi-Agente JELLYFISH.",
    version="7.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Endpoints de API REST
app.include_router(api_router, prefix="/api")

# Montar Interfaz Gráfica Web UI Integrada (Nexus Frontend SPA)
dist_dir = os.path.join(base_dir, "web-ui", "dist")
if os.path.exists(dist_dir):
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            return FileResponse(os.path.join(dist_dir, "index.html"))
        
        target_file = os.path.join(dist_dir, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(dist_dir, "index.html"))

if __name__ == "__main__":
    print("\n=======================================================")
    print(" 🚀 INICIANDO NEXUS OS v7.0 (Ecosistema 3 en 1)")
    print("    • NEXUS: Chat Conversacional Libre & Núcleo")
    print("    • ESCRIBA: Motor Narrativo & Marco Teórico")
    print("    • JELLYFISH: Motor Ágil Multi-Agente & Scrum")
    print("=======================================================")
    print(" 🌐 Interfaz Web activa en: http://localhost:8001\n")
    uvicorn.run("nexus:app", host="127.0.0.1", port=8001, reload=True)

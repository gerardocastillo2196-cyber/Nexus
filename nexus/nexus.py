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

# Configuración de Seguridad Blue Team: Restricción de CORS y Orígenes Permitidos
allowed_origins_env = os.environ.get("NEXUS_ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = [o.strip() for o in allowed_origins_env.split(",") if o.strip()] or [
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class LocalhostSecurityMiddleware(BaseHTTPMiddleware):
    """Protección contra ataques CSRF / Drive-By desde sitios web externos hacia la API local."""
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin")
        if origin and request.url.path.startswith("/api/"):
            normalized_origin = origin.rstrip("/")
            valid_origins = [o.rstrip("/") for o in ALLOWED_ORIGINS]
            if normalized_origin not in valid_origins:
                logging.getLogger("nexus.security").warning(
                    "[ALERTA DE SEGURIDAD] Petición cross-origin no autorizada bloqueada desde %s a %s",
                    origin, request.url.path
                )
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Forbidden: Petición cross-origin bloqueada por política de seguridad de Nexus OS."}
                )
        return await call_next(request)

app.add_middleware(LocalhostSecurityMiddleware)

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

def print_startup_banner():
    try:
        from rich.console import Console
        from rich.panel import Panel
        from rich.table import Table
        from rich.text import Text

        console = Console()
        banner_text = Text()
        banner_text.append(" ███╗   ██╗███████╗██╗   ██╗██╗   ██╗███████╗    ██████╗ ███████╗\n", style="bold #818cf8")
        banner_text.append(" ████╗  ██║██╔════╝██║   ██║██║   ██║██╔════╝   ██╔═══██╗██╔════╝\n", style="bold #a78bfa")
        banner_text.append(" ██╔██╗ ██║█████╗  ╚██╗ ██╔╝██║   ██║███████╗   ██║   ██║███████╗\n", style="bold #c084fc")
        banner_text.append(" ██║╚██╗██║██╔══╝   ╚████╔╝ ██║   ██║╚════██║   ██║   ██║╚════██║\n", style="bold #60a5fa")
        banner_text.append(" ██║ ╚████║███████╗  ╚██╔╝  ╚██████╔╝███████║██╗╚██████╔╝███████║\n", style="bold #22d3ee")
        banner_text.append(" ╚═╝  ╚═══╝╚══════╝   ╚═╝    ╚═════╝ ╚══════╝╚═╝ ╚═════╝ ╚══════╝\n", style="bold #38bdf8")
        banner_text.append("                     ENTERPRISE COGNITIVE PLATFORM v7.0\n", style="italic #94a3b8")

        table = Table(show_header=False, box=None, padding=(0, 2))
        table.add_row("[bold #818cf8][NEXUS CORE][/bold #818cf8]", "[dim]Orquestador Conversacional & Interfaz 3D React/Three.js[/dim]")
        table.add_row("[bold #fb923c][ESCRIBA ENGINE][/bold #fb923c]", "[dim]Arquitectura Narrativa, Worldbuilding & Grafo Semántico[/dim]")
        table.add_row("[bold #38bdf8][JELLYFISH SWARM][/bold #38bdf8]", "[dim]Enjambre Multi-Agente, Scrum Ágil & RAG Vectorial[/dim]")

        console.print()
        console.print(Panel(banner_text, border_style="#6366f1", expand=False))
        console.print(Panel(table, title="[bold green]ECOSISTEMA ACTIVO[/bold green]", border_style="#3b82f6", expand=False))
        console.print(Panel("[bold white]Interfaz Web & API en vivo:[/bold white] [bold cyan underline]http://127.0.0.1:8001[/bold cyan underline]\n[dim]Protección Blue Team CORS y Localhost activas.[/dim]", border_style="#22c55e", expand=False))
        console.print()
    except Exception:
        print("\n" + "="*60)
        print("  NEXUS OS v7.0 — PLATAFORMA INTEGRADA")
        print("  • NEXUS: Chat Conversacional Libre & Núcleo")
        print("  • ESCRIBA: Motor Narrativo & Marco Teórico")
        print("  • JELLYFISH: Motor Ágil Multi-Agente & Scrum")
        print("  Interfaz Web activa en: http://127.0.0.1:8001")
        print("="*60 + "\n")

if __name__ == "__main__":
    print_startup_banner()
    uvicorn.run("nexus:app", host="127.0.0.1", port=8001, reload=True)

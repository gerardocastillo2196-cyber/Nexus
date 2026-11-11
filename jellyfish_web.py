#!/usr/bin/env python3
"""jellyfish_web.py — Alias de compatibilidad raíz hacia nexus.py para Nexus OS v7.0."""

import os
import sys

base_dir = os.path.dirname(os.path.abspath(__file__))
venv_python = os.path.join(base_dir, ".venv", "bin", "python3")

# Auto-activar .venv si se ejecutó con python3 del sistema
if os.path.exists(venv_python) and sys.executable != venv_python and not os.environ.get("NEXUS_VENV_ACTIVATED"):
    os.environ["NEXUS_VENV_ACTIVATED"] = "1"
    os.execv(venv_python, [venv_python] + sys.argv)

nexus_dir = os.path.join(base_dir, "nexus")
if nexus_dir not in sys.path:
    sys.path.insert(0, nexus_dir)

import uvicorn

if __name__ == "__main__":
    print("\n=======================================================")
    print(" 🚀 INICIANDO NEXUS OS v7.0 (Ecosistema 3 en 1)")
    print("    • NEXUS: Chat Conversacional Libre & Núcleo")
    print("    • ESCRIBA: Motor Narrativo & Marco Teórico")
    print("    • JELLYFISH: Motor Ágil Multi-Agente & Scrum")
    print("=======================================================")
    print(" 🌐 Interfaz Web activa en: http://localhost:8001\n")
    uvicorn.run("nexus:app", host="127.0.0.1", port=8001, reload=True)

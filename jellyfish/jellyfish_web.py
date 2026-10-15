"""jellyfish_web.py — Alias de compatibilidad hacia nexus.py para Nexus OS v7.0."""

from nexus import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("nexus:app", host="127.0.0.1", port=8001, reload=True)

"""core/api/rag.py — Endpoints de RAG (Base de datos vectorial) para la API Web de Jellyfish."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.api.deps import get_state, get_rag

router = APIRouter(prefix="/rag")
logger = logging.getLogger("jellyfish.api.rag")


class RagToggleRequest(BaseModel):
    enabled: bool


class RagAddDocRequest(BaseModel):
    filename: str
    content: str


class RagRemovePathRequest(BaseModel):
    path: str


@router.get("/status")
async def rag_status():
    """Retorna el estado de la base vectorial RAG."""
    rag = get_rag()
    if not rag:
        return {"status": "Inactivo", "documents_indexed": 0}
    return {
        "status": rag.status_text,
        "is_active": rag.is_active,
        "indexed_files_count": len(rag.indexed_files),
        "indexed_files": list(rag.indexed_files)
    }


@router.post("/toggle")
async def rag_toggle(req: RagToggleRequest):
    """Activa o desactiva la búsqueda RAG."""
    rag = get_rag()
    if not rag:
        raise HTTPException(status_code=500, detail="Motor RAG no disponible")
    rag.is_active = req.enabled
    return {"status": "ok", "is_active": rag.is_active}


@router.post("/reindex")
async def rag_reindex():
    """Reindexa el proyecto activo en la base de datos vectorial."""
    state = get_state()
    rag = get_rag()
    if not rag:
        raise HTTPException(status_code=500, detail="Motor RAG no disponible")
    try:
        count = rag.index_project(state.active_project)
        return {"status": "ok", "indexed_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clear")
async def rag_clear():
    """Limpia todos los vectores de la base RAG."""
    rag = get_rag()
    if not rag:
        raise HTTPException(status_code=500, detail="Motor RAG no disponible")
    try:
        rag.clear()
        return {"status": "ok", "message": "Base vectorial limpiada."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add_doc")
async def rag_add_doc(req: RagAddDocRequest):
    """Agrega un documento individual a la base RAG."""
    rag = get_rag()
    if not rag:
        raise HTTPException(status_code=500, detail="Motor RAG no disponible")
    try:
        rag.add_document(req.filename, req.content)
        return {"status": "ok", "filename": req.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove_path")
async def rag_remove_path(req: RagRemovePathRequest):
    """Elimina un documento por ruta de la base RAG."""
    rag = get_rag()
    if not rag:
        raise HTTPException(status_code=500, detail="Motor RAG no disponible")
    try:
        rag.remove_path(req.path)
        return {"status": "ok", "removed_path": req.path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

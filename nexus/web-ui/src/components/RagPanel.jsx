import React, { useState, useEffect } from 'react';

export default function RagPanel({ onClose, onStateRefresh }) {
  const [ragStatus, setRagStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form para agregar documento
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [removePath, setRemovePath] = useState('');

  const fetchRagStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rag/status');
      if (res.ok) {
        const data = await res.json();
        setRagStatus(data);
      }
    } catch (err) {
      console.error('Error al obtener estado de RAG:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRagStatus();
  }, []);

  const handleToggleRag = async (enabled) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/rag/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `RAG ${enabled ? 'Activado' : 'Desactivado'}` });
        await fetchRagStatus();
        onStateRefresh?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al cambiar estado de RAG' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReindex = async () => {
    try {
      setActionLoading(true);
      setMessage({ type: 'info', text: 'Reindexando código base... por favor espera.' });
      const res = await fetch('/api/rag/reindex', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Indexación completada: ${data.file_count} archivos -> ${data.chunks} fragmentos` 
        });
        await fetchRagStatus();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al reindexar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al reindexar' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearIndex = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar completamente el índice vectorial RAG?')) return;
    try {
      setActionLoading(true);
      const res = await fetch('/api/rag/clear', { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Índice RAG borrado por completo' });
        await fetchRagStatus();
        onStateRefresh?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al borrar el índice' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDoc = async (e) => {
    e.preventDefault();
    if (!newDocName || !newDocContent) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/rag/add_doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: newDocName, content: newDocContent })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setNewDocName('');
        setNewDocContent('');
        await fetchRagStatus();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al guardar el documento' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al enviar documento' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePath = async (e) => {
    e.preventDefault();
    if (!removePath) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/rag/remove_path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: removePath })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `${data.deleted_chunks} fragmentos eliminados de ${removePath}` });
        setRemovePath('');
        await fetchRagStatus();
        onStateRefresh?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al eliminar la ruta' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>Administración de RAG (Retrieval-Augmented Generation)</h2>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {message && (
            <div className={`alert-banner alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="panel-loading">Cargando estado del RAG...</div>
          ) : (
            <div className="rag-admin-grid">
              {/* Cards de Métricas */}
              <div className="metrics-row">
                <div className="metric-card">
                  <span className="metric-label">Estado RAG</span>
                  <div className="metric-value-row">
                    <span className={`status-pill ${ragStatus?.is_active ? 'active' : 'inactive'}`}>
                      {ragStatus?.status_text}
                    </span>
                    <label className="switch-toggle">
                      <input 
                        type="checkbox" 
                        checked={ragStatus?.enabled || false}
                        onChange={(e) => handleToggleRag(e.target.checked)}
                        disabled={actionLoading}
                      />
                      <span className="slider round" />
                    </label>
                  </div>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Archivos Indexados</span>
                  <span className="metric-number">{ragStatus?.indexed_file_count || 0}</span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Chunks Vectoriales</span>
                  <span className="metric-number">{ragStatus?.indexed_chunk_count || 0}</span>
                </div>
              </div>

              {/* Info de proyecto y DB */}
              <div className="info-box">
                <div className="info-item">
                  <span className="info-label">Directorio Indexado:</span>
                  <span className="info-value path-text">{ragStatus?.indexed_dir || 'Ninguno'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ruta Base Vectorial (Chroma):</span>
                  <span className="info-value path-text">{ragStatus?.db_path || 'No creada'}</span>
                </div>
              </div>

              {/* Botones de Acción RAG */}
              <div className="rag-actions-bar">
                <button 
                  className="btn btn-primary"
                  onClick={handleReindex}
                  disabled={actionLoading}
                >
                  Reindexar Proyecto Completo
                </button>

                <button 
                  className="btn btn-danger"
                  onClick={handleClearIndex}
                  disabled={actionLoading || !ragStatus?.indexed_chunk_count}
                >
                  Limpiar Índice RAG
                </button>
              </div>

              <hr className="divider" />

              {/* Sección para agregar documentos/código */}
              <div className="form-section">
                <h3>Ingestar Nuevo Documento o Código</h3>
                <form onSubmit={handleAddDoc} className="rag-doc-form">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Nombre del archivo (ej: docs/ARQUITECTURA.md)"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    required
                  />
                  <textarea
                    className="input-field textarea-field"
                    rows="4"
                    placeholder="Contenido del documento o snippet de código a indexar..."
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-secondary" disabled={actionLoading}>
                    Guardar e Indexar Documento
                  </button>
                </form>
              </div>

              {/* Sección para eliminar archivo */}
              <div className="form-section">
                <h3>Eliminar Ruta de RAG</h3>
                <form onSubmit={handleRemovePath} className="rag-doc-form inline-form">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ruta relativa o absoluta a eliminar (ej: docs/viejo.md)"
                    value={removePath}
                    onChange={(e) => setRemovePath(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-outline-danger" disabled={actionLoading}>
                    Eliminar
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

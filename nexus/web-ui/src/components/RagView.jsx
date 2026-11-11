import React, { useState, useEffect } from 'react';

export default function RagView({ onStateRefresh, onNavigate }) {
  const [ragStatus, setRagStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

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
          text: `Indexación completada: ${data.file_count} archivos → ${data.chunks} fragmentos` 
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
        setMessage({ type: 'success', text: `${data.message}` });
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
    <div className="full-view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div>
            <h1 className="view-title">Motor RAG & Base Vectorial</h1>
            <p className="view-subtitle">Administración de la base de conocimiento de código fuente (ChromaDB)</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('chat')}>
          Volver al Chat
        </button>
      </div>

      <div className="view-content">
        {message && (
          <div className={`alert-banner alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="panel-loading">Cargando estado del motor RAG...</div>
        ) : (
          <div className="view-cards-grid">
            <div className="view-card">
              <h3>Métricas de la Base Vectorial</h3>
              <div className="metrics-row" style={{ marginTop: '12px' }}>
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

              <div className="info-box" style={{ marginTop: '16px' }}>
                <div className="info-item">
                  <span className="info-label">Directorio Indexado:</span>
                  <span className="info-value path-text">{ragStatus?.indexed_dir || 'Ninguno'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Ruta Base Vectorial (Chroma):</span>
                  <span className="info-value path-text">{ragStatus?.db_path || 'No creada'}</span>
                </div>
              </div>
            </div>

            <div className="view-card">
              <h3>Operaciones del Índice RAG</h3>
              <div className="rag-actions-bar" style={{ marginTop: '12px' }}>
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
            </div>

            <div className="view-card">
              <h3>Ingestar Nuevo Documento o Código Fuente</h3>
              <form onSubmit={handleAddDoc} className="rag-doc-form" style={{ marginTop: '12px' }}>
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

            <div className="view-card">
              <h3>Eliminar Ruta de RAG</h3>
              <form onSubmit={handleRemovePath} className="rag-doc-form inline-form" style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ruta relativa o absoluta (ej: docs/obsoleto.md)"
                  value={removePath}
                  onChange={(e) => setRemovePath(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-outline-danger" disabled={actionLoading}>
                  Eliminar del Índice
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function ProjectPanel({ onClose, onStateRefresh }) {
  const [projectInfo, setProjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Form states
  const [switchPath, setSwitchPath] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newParentDir, setNewParentDir] = useState('');

  const fetchProjectInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjectInfo(data);
      }
    } catch (err) {
      console.error('Error al obtener datos del proyecto:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectInfo();
  }, []);

  const handleSwitchProject = async (e) => {
    e.preventDefault();
    if (!switchPath) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: switchPath })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✓ ${data.message}` });
        setSwitchPath('');
        await fetchProjectInfo();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al cambiar de proyecto' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al cambiar de proyecto' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, parent_dir: newParentDir || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `✓ ${data.message}` });
        setNewProjectName('');
        setNewParentDir('');
        await fetchProjectInfo();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al crear proyecto' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al crear proyecto' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoApprove = async (enabled) => {
    try {
      setActionLoading(true);
      const res = await fetch('/api/projects/auto_approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Auto-aprobación de comandos ${enabled ? 'ACTIVADA' : 'DESACTIVADA'}` 
        });
        await fetchProjectInfo();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al actualizar auto-aprobación' });
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
            <span className="modal-icon"></span>
            <h2>Administración de Proyectos y Workspace</h2>
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
            <div className="panel-loading">Cargando información del proyecto...</div>
          ) : (
            <div className="project-admin-grid">
              {/* Project Status Summary */}
              <div className="project-summary-box">
                <div className="project-header-row">
                  <div>
                    <h3 className="project-title-text">{projectInfo?.project_name || 'Sin Proyecto'}</h3>
                    <span className="project-path-text">{projectInfo?.active_project || 'No hay ruta activa'}</span>
                  </div>
                  <div className="project-badges">
                    <span className="badge badge-scrum">
                      {projectInfo?.methodology?.toUpperCase() || 'SCRUM'}
                    </span>
                    <span className="badge badge-files">
                      {projectInfo?.files_count || 0} archivos
                    </span>
                  </div>
                </div>

                {projectInfo?.stack?.length > 0 && (
                  <div className="stack-tags">
                    <span className="stack-label">Tecnologías Detectadas:</span>
                    {projectInfo.stack.map(tech => (
                      <span key={tech} className="tech-pill">{tech}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto Approve Toggle */}
              <div className="setting-card">
                <div className="setting-info">
                  <span className="setting-title"> Auto-aprobación de Comandos de Terminal</span>
                  <span className="setting-sub">
                    Permite que Nexus OS ejecute comandos bash automáticamente sin requerir confirmación manual.
                  </span>
                </div>
                <label className="switch-toggle">
                  <input 
                    type="checkbox"
                    checked={projectInfo?.auto_approve || false}
                    onChange={(e) => handleToggleAutoApprove(e.target.checked)}
                    disabled={actionLoading || !projectInfo?.active_project}
                  />
                  <span className="slider round" />
                </label>
              </div>

              <hr className="divider" />

              {/* Form 1: Switch Project */}
              <div className="form-section">
                <h3>📂 Cambiar a un Proyecto Existente</h3>
                <form onSubmit={handleSwitchProject} className="rag-doc-form inline-form">
                  <input 
                    type="text"
                    className="input-field"
                    placeholder="Ruta absoluta al directorio (ej: /home/gerardo/Proyectos/mi_app)"
                    value={switchPath}
                    onChange={(e) => setSwitchPath(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    Cambiar Proyecto
                  </button>
                </form>
              </div>

              {/* Form 2: Create New Project */}
              <div className="form-section">
                <h3>✨ Crear Nuevo Proyecto de Software</h3>
                <form onSubmit={handleCreateProject} className="settings-form">
                  <div className="form-group-row">
                    <div className="form-group">
                      <label className="form-label">Nombre del Proyecto</label>
                      <input 
                        type="text"
                        className="input-field"
                        placeholder="ej: sistema-gestion-web"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Directorio Padre (Opcional)</label>
                      <input 
                        type="text"
                        className="input-field"
                        placeholder="Dejar en blanco para usar la ubicación predeterminada"
                        value={newParentDir}
                        onChange={(e) => setNewParentDir(e.target.value)}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" disabled={actionLoading}>
                    Crear e Inicializar Estructura SCRUM
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

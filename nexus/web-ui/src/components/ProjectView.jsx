import React, { useState, useEffect } from 'react';

export default function ProjectView({ onStateRefresh, onNavigate }) {
  const [projectInfo, setProjectInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

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

  const handleUnlinkProject = async () => {
    if (!window.confirm('¿Confirmas que deseas desvincular el proyecto de desarrollo activo?')) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/projects/unlink', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        await fetchProjectInfo();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error al desvincular el proyecto' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al desvincular el proyecto' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="full-view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div>
            <h1 className="view-title">Administración de Proyectos y Workspace</h1>
            <p className="view-subtitle">Gestión de proyectos activos, creación de nuevos espacios de trabajo y permisos</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('chat')}>
          ➔ Volver al Chat
        </button>
      </div>

      <div className="view-content">
        {message && (
          <div className={`alert-banner alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="panel-loading">Cargando información del proyecto...</div>
        ) : (
          <div className="view-cards-grid">
            <div className="view-card">
              <div className="card-header-title">
                <h3>Proyecto Activo</h3>
                <span className="badge badge-scrum">{projectInfo?.methodology?.toUpperCase() || 'SCRUM'}</span>
              </div>

              <div className="project-detail-box">
                <div className="detail-row">
                  <span className="detail-label">Nombre del Proyecto:</span>
                  <span className="detail-value highlight">{projectInfo?.project_name || 'Sin Proyecto'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Ruta en Disco:</span>
                  <span className="detail-value path-text">{projectInfo?.active_project || 'Ninguna'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Archivos Totales:</span>
                  <span className="detail-value">{projectInfo?.files_count || 0} archivos</span>
                </div>

                {projectInfo?.stack?.length > 0 && (
                  <div className="detail-row">
                    <span className="detail-label">Tecnologías Detectadas:</span>
                    <div className="tech-pills-row">
                      {projectInfo.stack.map(tech => (
                        <span key={tech} className="tech-pill">{tech}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    className="btn btn-danger"
                    onClick={handleUnlinkProject}
                    disabled={actionLoading || !projectInfo?.active_project}
                    style={{ width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#fca5a5', borderRadius: '6px', fontWeight: 600, cursor: projectInfo?.active_project ? 'pointer' : 'not-allowed' }}
                  >
                    Desvincular Proyecto Activo
                  </button>
                </div>
              </div>
            </div>

            <div className="view-card">
              <div className="card-header-title">
                <h3>Permisos de Ejecución de Comandos</h3>
              </div>

              <div className="setting-card">
                <div className="setting-info">
                  <span className="setting-title">Auto-aprobación para este proyecto</span>
                  <span className="setting-sub">
                    Permite que Nexus OS ejecute herramientas y comandos bash sin requerir confirmación manual.
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
            </div>

            <div className="view-card">
              <div className="card-header-title">
                <h3>Cambiar de Proyecto</h3>
              </div>

              <form onSubmit={handleSwitchProject} className="rag-doc-form inline-form">
                <input 
                  type="text"
                  className="input-field"
                  placeholder="Ruta absoluta (ej: /home/gerardo/Proyectos/mi_app)"
                  value={switchPath}
                  onChange={(e) => setSwitchPath(e.target.value)}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  Cambiar Proyecto
                </button>
              </form>
            </div>

            <div className="view-card">
              <div className="card-header-title">
                <h3>Crear Nuevo Proyecto de Software</h3>
              </div>

              <form onSubmit={handleCreateProject} className="settings-form">
                <div className="form-group-row">
                  <div className="form-group">
                    <label className="form-label">Nombre del Proyecto</label>
                    <input 
                      type="text"
                      className="input-field"
                      placeholder="ej: sistema-web-v2"
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
                      placeholder="Ubicación por defecto"
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
    </div>
  );
}

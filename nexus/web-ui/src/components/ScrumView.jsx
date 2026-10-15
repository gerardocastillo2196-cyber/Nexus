import React, { useState, useEffect } from 'react';

export default function ScrumView({ onNavigate, initialTab = 'sprint_board' }) {
  const [scrumData, setScrumData] = useState({ backlog: '', sprint_board: '', daily: '' });
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

  // Form state para crear proyecto SCRUM
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectVision, setProjectVision] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState('');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const fetchScrumData = () => {
    setLoading(true);
    fetch('/api/scrum')
      .then(res => res.json())
      .then(data => setScrumData(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchScrumData();
  }, []);

  const handleCreateScrumProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setCreating(true);
    setCreateMessage('Inicializando proyecto Jellyfish con @product_owner y @scrum_master...');

    try {
      const res = await fetch('/api/scrum/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
          vision: projectVision
        })
      });

      if (res.ok) {
        const data = await res.json();
        setScrumData({
          backlog: data.backlog,
          sprint_board: data.sprint_board,
          daily: data.daily
        });
        setCreateMessage('✓ Proyecto Jellyfish creado exitosamente. Backlog e Historias generadas.');
        setTimeout(() => {
          setCreateMessage('');
          setActiveTab('sprint_board');
        }, 1500);
      } else {
        setCreateMessage('Error al crear el proyecto Jellyfish.');
      }
    } catch (err) {
      setCreateMessage('Error de conexión al crear proyecto Jellyfish.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="full-view-container" style={{ padding: '24px', color: '#e3e3e3', height: '100%', overflowY: 'auto' }}>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <div className="view-title-group">
          <div>
            <h1 className="view-title" style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#60a5fa' }}>
              Agencia Jellyfish & Gestión de Proyectos Ágiles
            </h1>
            <p className="view-subtitle" style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
              Inicializa proyectos de software, gestiona el Product Backlog y monitorea Sprints con los agentes PO y Scrum Master.
            </p>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('chat')}
          style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}
        >
          ➔ Volver al Chat
        </button>
      </div>

      <div className="view-tabs-bar" style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
        <button
          className={`view-tab-btn ${activeTab === 'create_project' ? 'active' : ''}`}
          onClick={() => setActiveTab('create_project')}
          style={{
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
            background: activeTab === 'create_project' ? '#2563eb' : 'rgba(255,255,255,0.05)',
            border: activeTab === 'create_project' ? 'none' : '1px solid rgba(255,255,255,0.15)',
            color: '#fff'
          }}
        >
          + Crear Proyecto Jellyfish
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'sprint_board' ? 'active' : ''}`}
          onClick={() => setActiveTab('sprint_board')}
          style={{
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: activeTab === 'sprint_board' ? '#2563eb' : 'rgba(255,255,255,0.05)',
            border: activeTab === 'sprint_board' ? 'none' : '1px solid rgba(255,255,255,0.15)',
            color: '#fff'
          }}
        >
          Sprint Board
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'backlog' ? 'active' : ''}`}
          onClick={() => setActiveTab('backlog')}
          style={{
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: activeTab === 'backlog' ? '#2563eb' : 'rgba(255,255,255,0.05)',
            border: activeTab === 'backlog' ? 'none' : '1px solid rgba(255,255,255,0.15)',
            color: '#fff'
          }}
        >
          Product Backlog
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
          style={{
            padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: activeTab === 'daily' ? '#2563eb' : 'rgba(255,255,255,0.05)',
            border: activeTab === 'daily' ? 'none' : '1px solid rgba(255,255,255,0.15)',
            color: '#fff'
          }}
        >
          Daily Log
        </button>
      </div>

      <div className="view-content">
        {activeTab === 'create_project' && (
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', maxWidth: '750px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#fff' }}>Inicializar Nuevo Proyecto Jellyfish</h2>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#94a3b8' }}>
              La Agencia Jellyfish coordinará a los agentes <strong>@product_owner</strong> y <strong>@scrum_master</strong> para desglosar la visión en Historias de Usuario e inicializar los tableros.
            </p>

            <form onSubmit={handleCreateScrumProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Nombre del Proyecto Jellyfish:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Sistema de Facturación Electrónica"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Visión del Producto / Objetivo Principal:
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe qué resuelve el producto, quiénes son los usuarios finales y el valor entregado..."
                  value={projectVision}
                  onChange={(e) => setProjectVision(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Descripción Técnica Corta:
                </label>
                <input
                  type="text"
                  placeholder="ej. Aplicación web moderna en React y backend Python FastAPI"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '12px 24px', background: '#2563eb', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                >
                  {creating ? 'Creando Proyecto...' : 'Inicializar Proyecto Jellyfish'}
                </button>
                {createMessage && (
                  <span style={{ fontSize: '13px', color: '#93c5fd', fontWeight: 600 }}>{createMessage}</span>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab !== 'create_project' && (
          loading ? (
            <div className="panel-loading" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando tablero SCRUM...</div>
          ) : (
            <div className="view-card full-width-card" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px' }}>
              <pre className="scrum-pre" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.5, color: '#f1f5f9' }}>
                {scrumData[activeTab] || `No se encontró información para ${activeTab}.md en el proyecto actual.`}
              </pre>
            </div>
          )
        )}
      </div>
    </div>
  );
}

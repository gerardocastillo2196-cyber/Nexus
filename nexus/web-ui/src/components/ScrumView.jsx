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
        setCreateMessage('[OK] Proyecto Jellyfish creado exitosamente. Backlog e Historias generadas.');
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
    <div className="full-view-container" style={{ padding: '28px', color: '#f8fafc', height: '100%', overflowY: 'auto', background: 'transparent' }}>
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '18px', flexWrap: 'wrap', gap: '16px' }}>
        <div className="view-title-group">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="view-title" style={{
                margin: 0, fontSize: '24px', fontWeight: 800,
                fontFamily: 'var(--font-display, Outfit, sans-serif)',
                background: 'linear-gradient(135deg, #ffffff 40%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Agencia Jellyfish — Gestión de Proyectos Ágiles & Swarm
              </h1>
            </div>
            <p className="view-subtitle" style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Product Backlog, Sprints coordinados y orquestación multi-agente con @product_owner y @scrum_master.
            </p>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('chat')}
          style={{
            padding: '8px 18px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
            color: '#f8fafc', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
          }}
        >
          Volver al Chat
        </button>
      </div>

      <div className="view-tabs-bar" style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          className={`view-tab-btn ${activeTab === 'create_project' ? 'active' : ''}`}
          onClick={() => setActiveTab('create_project')}
          style={{
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
            background: activeTab === 'create_project' ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' : 'rgba(255,255,255,0.03)',
            border: activeTab === 'create_project' ? 'none' : '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            boxShadow: activeTab === 'create_project' ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          + Crear Proyecto Jellyfish
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'sprint_board' ? 'active' : ''}`}
          onClick={() => setActiveTab('sprint_board')}
          style={{
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: activeTab === 'sprint_board' ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' : 'rgba(255,255,255,0.03)',
            border: activeTab === 'sprint_board' ? 'none' : '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            boxShadow: activeTab === 'sprint_board' ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Sprint Board
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'backlog' ? 'active' : ''}`}
          onClick={() => setActiveTab('backlog')}
          style={{
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: activeTab === 'backlog' ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' : 'rgba(255,255,255,0.03)',
            border: activeTab === 'backlog' ? 'none' : '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            boxShadow: activeTab === 'backlog' ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Product Backlog
        </button>
        <button
          className={`view-tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
          style={{
            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
            background: activeTab === 'daily' ? 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' : 'rgba(255,255,255,0.03)',
            border: activeTab === 'daily' ? 'none' : '1px solid rgba(255,255,255,0.08)',
            color: '#fff',
            boxShadow: activeTab === 'daily' ? '0 4px 16px rgba(59, 130, 246, 0.4)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          Daily Log
        </button>
      </div>

      <div className="view-content">
        {activeTab === 'create_project' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(14, 26, 46, 0.8) 0%, rgba(10, 15, 30, 0.8) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px', padding: '28px', maxWidth: '800px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: 700, color: '#f8fafc' }}>
              Inicializar Nuevo Proyecto Jellyfish
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8' }}>
              La Agencia Jellyfish coordinará a los agentes <strong style={{ color: '#38bdf8' }}>@product_owner</strong> y <strong style={{ color: '#38bdf8' }}>@scrum_master</strong> para desglosar la visión en Historias de Usuario e inicializar los tableros.
            </p>

            <form onSubmit={handleCreateScrumProject} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>
                  Nombre del Proyecto Jellyfish:
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Sistema de Facturación Electrónica"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', color: '#fff', fontSize: '14px',
                    outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>
                  Visión del Producto / Objetivo Principal:
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe qué resuelve el producto, quiénes son los usuarios finales y el valor entregado..."
                  value={projectVision}
                  onChange={(e) => setProjectVision(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', color: '#fff', fontSize: '13px',
                    resize: 'vertical', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px', fontWeight: 600 }}>
                  Descripción Técnica Corta:
                </label>
                <input
                  type="text"
                  placeholder="ej. Aplicación web moderna en React y backend Python FastAPI"
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '10px', color: '#fff', fontSize: '13px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.15)'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '12px 28px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                    border: 'none', borderRadius: '10px', color: '#fff',
                    fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer', fontSize: '14px',
                    boxShadow: '0 4px 18px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  {creating ? 'Creando Proyecto...' : 'Inicializar Proyecto Jellyfish'}
                </button>
                {createMessage && (
                  <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 600 }}>{createMessage}</span>
                )}
              </div>
            </form>
          </div>
        )}

        {activeTab !== 'create_project' && (
          loading ? (
            <div className="panel-loading" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
              Cargando tablero SCRUM de Jellyfish...
            </div>
          ) : (
            <div className="view-card full-width-card" style={{
              background: 'rgba(10, 16, 32, 0.75)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              borderRadius: '16px', padding: '24px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeTab.replace('_', ' ')}.md
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Markdown renderizado
                </span>
              </div>
              <pre className="scrum-pre" style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#e2e8f0',
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '18px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                maxHeight: '65vh',
                overflowY: 'auto'
              }}>
                {scrumData[activeTab] || `No se encontró información para ${activeTab}.md en el proyecto actual.`}
              </pre>
            </div>
          )
        )}
      </div>
    </div>
  );
}

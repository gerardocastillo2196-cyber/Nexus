import React, { useState, useEffect } from 'react';

export default function StoreView({ systemState, onStateRefresh, onNavigate }) {
  const [escribaActive, setEscribaActive] = useState(systemState?.escriba_active || false);
  const [scrumActive, setScrumActive] = useState(systemState?.scrum_active ?? false);
  const [togglingEscriba, setTogglingEscriba] = useState(false);
  const [togglingScrum, setTogglingScrum] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (systemState) {
      if (systemState.escriba_active !== undefined) setEscribaActive(systemState.escriba_active);
      if (systemState.scrum_active !== undefined) setScrumActive(systemState.scrum_active);
    }
  }, [systemState]);

  const handleToggleEscriba = async () => {
    try {
      setTogglingEscriba(true);
      const nextState = !escribaActive;
      const res = await fetch('/api/tools/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: 'escriba', enabled: nextState })
      });
      if (res.ok) {
        setEscribaActive(nextState);
        setMessage({
          type: 'success',
          text: nextState
            ? 'ESCRIBA activado con éxito. Las herramientas de Escriba están disponibles en la barra lateral.'
            : 'ESCRIBA desactivado.'
        });
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: 'Error al cambiar estado de ESCRIBA' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setTogglingEscriba(false);
    }
  };

  const handleToggleScrum = async () => {
    try {
      setTogglingScrum(true);
      const nextState = !scrumActive;
      const res = await fetch('/api/tools/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_name: 'scrum', enabled: nextState })
      });
      if (res.ok) {
        setScrumActive(nextState);
        setMessage({
          type: 'success',
          text: nextState
            ? 'Jellyfish activado con éxito. Herramientas ágiles y agentes de desarrollo habilitados.'
            : 'Jellyfish desactivado. Nexus operará como chat conversacional libre.'
        });
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: 'Error al cambiar estado de Jellyfish' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setTogglingScrum(false);
    }
  };

  return (
    <div className="full-view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div>
            <h1 className="view-title">Tienda de Herramientas Nexus</h1>
            <p className="view-subtitle">Activa extensiones y proyectos reales integrados con el motor de IA Nexus OS v7.0</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('chat')}>
          ➔ Volver al Chat
        </button>
      </div>

      <div className="view-content">
        {message && (
          <div className={`alert-banner alert-${message.type}`} style={{ marginBottom: '20px' }}>
            {message.text}
          </div>
        )}

        <div className="view-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {/* Card: ESCRIBA REAL */}
          <div 
            className="view-card"
            style={{
              border: escribaActive ? '1px solid var(--accent-color, #6366f1)' : '1px solid rgba(255, 255, 255, 0.1)',
              background: escribaActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--card-bg, #1e1e2e)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>ESCRIBA — Arquitectura Narrativa & Grafo</h3>
                <span className="view-subtitle" style={{ fontSize: '0.85rem' }}>Motor Nativo de Inteligencia Narrativa & Worldbuilding</span>
              </div>
              <span className={`status-badge ${escribaActive ? 'status-active' : 'status-inactive'}`}>
                {escribaActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
              Motor completo de análisis literario, simulación de conflictos sociopolíticos, extracción de grafos semánticos y diagnóstico de vacíos narrativos potenciado por Nexus OS.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', margin: '0 0 8px 0', color: '#94a3b8' }}>Herramientas del Proyecto ESCRIBA:</h4>
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <li><strong>Grafo & Entidades:</strong> Extracción de personajes, lugares y facciones con relaciones semánticas.</li>
                <li><strong>Simulador Efecto Dominó:</strong> Simulación What-If de consecuencias sociopolíticas en la historia.</li>
                <li><strong>Análisis Histórico & Geopolítico:</strong> Diagnóstico de poder, economía, creencias y cronología.</li>
                <li><strong>Detector de Vacíos Narrativos:</strong> Identificación de personajes aislados y arcos puente.</li>
                <li><strong>Ensamble Multi-Modelo:</strong> Consulta cruzada entre modelos sobre fricciones narrativas.</li>
              </ul>
            </div>

            <button 
              className={`btn ${escribaActive ? 'btn-outline-danger' : 'btn-primary'}`} 
              style={{ width: '100%' }}
              onClick={handleToggleEscriba}
              disabled={togglingEscriba}
            >
              {togglingEscriba 
                ? 'Procesando...' 
                : escribaActive ? 'Desactivar ESCRIBA' : 'Activar ESCRIBA'
              }
            </button>
          </div>

          {/* Card: Agencia & Motor Jellyfish */}
          <div 
            className="view-card"
            style={{
              border: scrumActive ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
              background: scrumActive ? 'rgba(59, 130, 246, 0.05)' : 'var(--card-bg, #1e1e2e)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Jellyfish — Agencia Ágil & Desarrollo</h3>
                <span className="view-subtitle" style={{ fontSize: '0.85rem' }}>Orquestación Ágil, Roles (@product_owner, @scrum_master) y Sprints</span>
              </div>
              <span className={`status-badge ${scrumActive ? 'status-active' : 'status-inactive'}`}>
                {scrumActive ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
              Administración de agencias especializadas de desarrollo, desglose de historias de usuario, tablero de sprints y asignación automática de agentes con la herramienta Jellyfish.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className={`btn ${scrumActive ? 'btn-outline-danger' : 'btn-primary'}`} 
                style={{ flex: 1 }}
                onClick={handleToggleScrum}
                disabled={togglingScrum}
              >
                {togglingScrum 
                  ? 'Procesando...' 
                  : scrumActive ? 'Desactivar Jellyfish' : 'Activar Jellyfish'
                }
              </button>
              {scrumActive && (
                <button className="btn btn-secondary" onClick={() => onNavigate('scrum')}>
                  Abrir Tablero Jellyfish
                </button>
              )}
            </div>
          </div>

          {/* Card: RAG Engine */}
          <div className="view-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>RAG Vector Engine</h3>
                <span className="view-subtitle" style={{ fontSize: '0.85rem' }}>Base de Conocimiento y Recuperación de Código</span>
              </div>
              <span className="status-badge status-active">Integrado</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '16px' }}>
              Motor de búsqueda semántica e indexación vectorial para proyectos locales y documentación técnica.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onNavigate('rag')}>
              Administrar RAG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

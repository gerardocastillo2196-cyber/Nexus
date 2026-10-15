import React from 'react';

export default function AgentStatusPanel({ state }) {
  if (!state) return <div className="agent-panel glass-panel"><div className="loading-pulse">Inicializando Enjambre...</div></div>;

  return (
    <div className="agent-panel glass-panel">
      <div className="panel-header">
        <h2>Nexus OS v7.0</h2>
        <div className="status-indicator online"></div>
      </div>
      
      <div className="status-section">
        <h3>Agente Activo</h3>
        <div className="agent-badge">@{state.active_agent}</div>
      </div>

      <div className="status-section">
        <h3>Motor Cognitivo</h3>
        <p className="detail-text">{state.provider}</p>
        <p className="detail-text model-text">{state.model}</p>
      </div>

      <div className="status-section">
        <h3>Proyecto Actual</h3>
        <p className="detail-text">{state.project}</p>
      </div>

      <div className="status-section">
        <h3>Salud del Sistema</h3>
        <ul className="health-list">
          <li><span className="label">Presupuesto Tokens:</span> {state.token_budget}</li>
          <li><span className="label">RAG Engine:</span> {state.rag_status}</li>
        </ul>
      </div>
    </div>
  );
}

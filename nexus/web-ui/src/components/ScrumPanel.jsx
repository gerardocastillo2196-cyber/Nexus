import React, { useState, useEffect } from 'react';

export default function ScrumPanel({ onClose }) {
  const [data, setData] = useState({ backlog: '', sprint_board: '', daily: '' });
  const [activeTab, setActiveTab] = useState('sprint_board');

  useEffect(() => {
    fetch('/api/scrum')
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(err));
  }, []);

  const TABS = [
    { key: 'sprint_board', label: 'Sprint Board', icon: '' },
    { key: 'backlog', label: 'Backlog', icon: '📦' },
    { key: 'daily', label: 'Daily Log', icon: '' },
  ];

  return (
    <div className="scrum-overlay" onClick={onClose}>
      <div className="scrum-panel" onClick={(e) => e.stopPropagation()}>
        <div className="scrum-panel-header">
          <h3> Artefactos Scrum</h3>
          <button className="scrum-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="scrum-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`scrum-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="scrum-content">
          {data[activeTab] || 'No hay datos disponibles para este artefacto. Asegúrate de tener un proyecto SCRUM activo vinculado.'}
        </div>
      </div>
    </div>
  );
}

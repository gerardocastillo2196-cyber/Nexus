import React, { useState, useEffect } from 'react';

export default function SettingsPanel({ onClose, onStateRefresh }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('model'); // 'model', 'context', 'skills'

  const [theme, setTheme] = useState('default');

  // Form states
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Context file state
  const [newContextPath, setNewContextPath] = useState('');

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setProvider(data.provider || 'ollama');
        setModel(data.model || '');
        setTheme(data.theme || (data.liquid_glass_enabled ? 'liquid_glass' : 'default'));
        setTemperature(data.temperature ?? 0.7);
        setMaxTokens(data.max_tokens ?? 4096);
        setSystemPrompt(data.system_prompt || '');
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          theme,
          liquid_glass_enabled: theme === 'liquid_glass',
          temperature: parseFloat(temperature),
          max_tokens: parseInt(maxTokens),
          system_prompt: systemPrompt
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '[OK] Configuración guardada con éxito' });
        await fetchConfig();
        onStateRefresh?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleContextFileAction = async (action, path) => {
    try {
      const res = await fetch('/api/context/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, path })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `[OK] Archivo de contexto ${action === 'add' ? 'agregado' : 'removido'}` });
        if (action === 'add') setNewContextPath('');
        await fetchConfig();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Error en archivo de contexto' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al actualizar contexto' });
    }
  };

  const handleToggleSkill = async (skillIdentifier, enabled) => {
    try {
      const res = await fetch('/api/skills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_name: skillIdentifier,
          skill_id: skillIdentifier,
          enabled
        })
      });
      if (res.ok) {
        await fetchConfig();
        onStateRefresh?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al conmutar habilidad' });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-icon"></span>
            <h2>Configuración del Modelo y Contexto</h2>
          </div>
          <button className="close-btn" onClick={onClose}>X</button>
        </div>

        {/* Tab Bar */}
        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'model' ? 'active' : ''}`}
            onClick={() => setActiveTab('model')}
          >
             Proveedor y Modelo
          </button>
          <button 
            className={`tab-btn ${activeTab === 'context' ? 'active' : ''}`}
            onClick={() => setActiveTab('context')}
          >
             Archivos de Contexto ({config?.context_files?.length || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
            onClick={() => setActiveTab('skills')}
          >
             Habilidades Active ({config?.active_skills?.length || 0})
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {message && (
            <div className={`alert-banner alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="panel-loading">Cargando configuración...</div>
          ) : (
            <>
              {/* TAB 1: MODEL & PROVIDER */}
              {activeTab === 'model' && (
                <form onSubmit={handleSaveConfig} className="settings-form">
                  <div className="form-group-row">
                    <div className="form-group">
                      <label className="form-label">Proveedor LLM</label>
                      <select 
                        className="input-field"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                      >
                        <option value="ollama">Ollama (Local / GPU)</option>
                        <option value="gemini">Google Gemini API</option>
                        <option value="openai">OpenAI API</option>
                        <option value="claude">Anthropic Claude</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Nombre del Modelo</label>
                      <input 
                        type="text"
                        className="input-field"
                        placeholder="ej: qwen2.5-coder:7b, gpt-4o, gemini-1.5-pro"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group-row">
                    <div className="form-group">
                      <label className="form-label">Temperatura: {temperature}</label>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        className="range-input"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                      />
                      <span className="form-hint">0.0 = Preciso y Determinista, 1.0 = Creativo</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Max Tokens de Respuesta</label>
                      <input 
                        type="number"
                        className="input-field"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">System Prompt Personalizado del Agente</label>
                    <textarea 
                      className="input-field textarea-field"
                      rows="4"
                      placeholder="Instrucciones base adicionales para el comportamiento del modelo..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Apariencia & Tema Visual del Sistema</label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
                      <select 
                        className="input-field"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="default">Nexus Default (Tema Oscuro Limpio)</option>
                        <option value="liquid_glass">Liquid Glass (Vidrio Líquido - Cristal & Acentos)</option>
                      </select>
                      <label className="switch-toggle">
                        <input 
                          type="checkbox"
                          checked={theme === 'liquid_glass'}
                          onChange={(e) => setTheme(e.target.checked ? 'liquid_glass' : 'default')}
                        />
                        <span className="slider round" />
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Configuración del Modelo'}
                  </button>
                </form>
              )}

              {/* TAB 2: CONTEXT FILES */}
              {activeTab === 'context' && (
                <div className="context-files-section">
                  <div className="form-section">
                    <h3>Cargar Archivo en el Contexto del Modelo</h3>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newContextPath) handleContextFileAction('add', newContextPath);
                      }} 
                      className="rag-doc-form inline-form"
                    >
                      <input 
                        type="text"
                        className="input-field"
                        placeholder="Ruta del archivo (ej: /ruta/a/mi_codigo.py)"
                        value={newContextPath}
                        onChange={(e) => setNewContextPath(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn btn-primary">
                        Cargar en Contexto
                      </button>
                    </form>
                  </div>

                  <div className="context-list-container">
                    <h3> Archivos Cargados Actualmente ({config?.context_files?.length || 0})</h3>
                    {config?.context_files?.length === 0 ? (
                      <div className="empty-state-text">No hay archivos cargados explícitamente en el contexto.</div>
                    ) : (
                      <ul className="file-list">
                        {config?.context_files?.map((filePath) => (
                          <li key={filePath} className="file-list-item">
                            <span className="file-path">{filePath}</span>
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleContextFileAction('remove', filePath)}
                            >
                              Remover
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: SKILLS */}
              {activeTab === 'skills' && (() => {
                const isEscriba = Boolean(config?.escriba_active);
                const isScrum = Boolean(config?.scrum_active) && !isEscriba;
                const activeEngine = isEscriba ? 'escriba' : (isScrum ? 'jellyfish' : 'nexus');

                const matchEcosystem = (skill) => {
                  const sEco = (skill.ecosystem || '').toLowerCase();
                  const agency = skill.agency || '';
                  if (activeEngine === 'escriba') {
                    return sEco === 'escriba' || agency === 'Creative';
                  }
                  if (activeEngine === 'jellyfish') {
                    // Jellyfish tiene acceso a desarrollo/agile Y a soporte técnico/estratégico de Nexus
                    return sEco === 'jellyfish' || sEco === 'nexus' || agency !== 'Creative';
                  }
                  return sEco === 'nexus' || ['Research', 'Legal & Media', 'Marketing'].includes(agency);
                };

                const visibleSkills = (config?.available_skills || []).filter(matchEcosystem);

                return (
                  <div className="skills-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h3 style={{ margin: 0 }}>Habilidades ({activeEngine.toUpperCase()})</h3>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', fontWeight: 600 }}>
                        {visibleSkills.length} disponibles
                      </span>
                    </div>
                    {visibleSkills.length === 0 ? (
                      <div className="empty-state-text">No hay habilidades registradas para el modo actual.</div>
                    ) : (
                      <div className="skills-grid">
                        {visibleSkills.map((skill) => (
                          <div key={skill.name} className="skill-card">
                            <div className="skill-info">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700 }}>
                                  {skill.agency || 'General'}
                                </span>
                                <span className="skill-name">{skill.name}</span>
                              </div>
                              <span className="skill-desc">{skill.description || 'Sin descripción'}</span>
                            </div>
                            <label className="switch-toggle">
                              <input 
                                type="checkbox"
                                checked={skill.enabled}
                                onChange={(e) => handleToggleSkill(skill.skill_id || skill.name, e.target.checked)}
                              />
                              <span className="slider round" />
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
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

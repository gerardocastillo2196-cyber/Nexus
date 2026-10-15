import React, { useState, useEffect } from 'react';

const ALL_PROVIDERS = [
  { id: 'ollama', label: 'Ollama Local (GPU / CPU)', requiresKey: false, defaultUrl: 'http://localhost:11434/api/chat', defaultModel: 'qwen2.5-agent:latest' },
  { id: 'openai', label: 'OpenAI API (GPT-4o, o1, o3)', requiresKey: true, defaultUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
  { id: 'deepseek', label: 'DeepSeek (Coder / Chat)', requiresKey: true, defaultUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-coder' },
  { id: 'openrouter', label: 'OpenRouter (Multi-Model Cloud)', requiresKey: true, defaultUrl: 'https://openrouter.ai/api/v1', defaultModel: 'meta-llama/llama-3.1-405b-instruct' },
  { id: 'gemini', label: 'Google Gemini (Flash / Pro)', requiresKey: true, defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-3.6-flash' },
  { id: 'groq', label: 'Groq Cloud (Baja Latencia QA)', requiresKey: true, defaultUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
  { id: 'qwen', label: 'Qwen / Alibaba DashScope', requiresKey: true, defaultUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-max' },
  { id: 'kimi', label: 'Kimi / Moonshot AI', requiresKey: true, defaultUrl: 'https://api.moonshot.ai/v1', defaultModel: 'moonshot-v1-8k' },
  { id: 'zhipu', label: 'Zhipu / GLM-4', requiresKey: true, defaultUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4' },
  { id: 'custom', label: 'OpenAI-Compatible Custom Endpoint', requiresKey: true, defaultUrl: '', defaultModel: 'custom-model' },
  { id: 'claude', label: 'Anthropic Claude (Sonnet / Haiku / Opus)', requiresKey: true, defaultUrl: 'https://api.anthropic.com/v1', defaultModel: 'claude-3-5-sonnet-20241022' }
];

export default function SettingsView({ onStateRefresh, onNavigate }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('providers');

  // Proveedor Global
  const [provider, setProvider] = useState('ollama');
  const [model, setModel] = useState('');

  // Enrutamiento Híbrido (Swarm Routing)
  const [useHybrid, setUseHybrid] = useState(true);
  const [plannerProvider, setPlannerProvider] = useState('gemini');
  const [plannerModel, setPlannerModel] = useState('gemini-3.6-flash');
  const [executorProvider, setExecutorProvider] = useState('ollama');
  const [executorModel, setExecutorModel] = useState('qwen2.5-coder:latest');
  const [qaProvider, setQaProvider] = useState('groq');
  const [qaModel, setQaModel] = useState('llama-3.3-70b-versatile');
  const [subagentProvider, setSubagentProvider] = useState('ollama');
  const [subagentModel, setSubagentModel] = useState('qwen2.5-coder:latest');

  // Límites y RAG
  const [contextLimit, setContextLimit] = useState(8192);
  const [localContextLimit, setLocalContextLimit] = useState(4096);
  const [relevanceThreshold, setRelevanceThreshold] = useState(1.2);
  const [embedModel, setEmbedModel] = useState('nomic-embed-text');
  const [showGuides, setShowGuides] = useState(true);

  // Hiperparámetros del LLM
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [systemPrompt, setSystemPrompt] = useState('');

  // Apariencia y Tema Visual
  const [theme, setTheme] = useState('default');

  // API Keys y Base URLs por proveedor
  const [apiKeys, setApiKeys] = useState({});
  const [baseUrls, setBaseUrls] = useState({});
  const [showKeys, setShowKeys] = useState({});

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

        setUseHybrid(data.use_hybrid ?? true);
        setPlannerProvider(data.planner_provider || 'gemini');
        setPlannerModel(data.planner_model || 'gemini-3.6-flash');
        setExecutorProvider(data.executor_provider || 'ollama');
        setExecutorModel(data.executor_model || 'qwen2.5-coder:latest');
        setQaProvider(data.qa_provider || 'groq');
        setQaModel(data.qa_model || 'llama-3.3-70b-versatile');
        setSubagentProvider(data.subagent_provider || data.provider || 'ollama');
        setSubagentModel(data.subagent_model || data.model || '');

        setContextLimit(data.context_limit ?? 8192);
        setLocalContextLimit(data.local_context_limit ?? 4096);
        setRelevanceThreshold(data.relevance_threshold ?? 1.2);
        setEmbedModel(data.embed_model || 'nomic-embed-text');
        setShowGuides(data.show_guides ?? true);

        setTemperature(data.temperature ?? 0.7);
        setMaxTokens(data.max_tokens ?? 4096);
        setSystemPrompt(data.system_prompt || '');

        setApiKeys(data.api_keys || {});
        setBaseUrls(data.base_urls || {});
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

  const handleSaveAll = async (e) => {
    if (e) e.preventDefault();
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
          use_hybrid: useHybrid,
          planner_provider: plannerProvider,
          planner_model: plannerModel,
          executor_provider: executorProvider,
          executor_model: executorModel,
          qa_provider: qaProvider,
          qa_model: qaModel,
          subagent_provider: subagentProvider,
          subagent_model: subagentModel,
          context_limit: parseInt(contextLimit),
          local_context_limit: parseInt(localContextLimit),
          relevance_threshold: parseFloat(relevanceThreshold),
          embed_model: embedModel,
          show_guides: showGuides,
          temperature: parseFloat(temperature),
          max_tokens: parseInt(maxTokens),
          system_prompt: systemPrompt,
          api_keys: apiKeys,
          base_urls: baseUrls
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: '✓ Toda la configuración se guardó en .env y se aplicó al sistema' });
        await fetchConfig();
        onStateRefresh?.();
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la configuración' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleApiKeyChange = (pId, value) => {
    setApiKeys((prev) => ({ ...prev, [pId]: value }));
  };

  const handleBaseUrlChange = (pId, value) => {
    setBaseUrls((prev) => ({ ...prev, [pId]: value }));
  };

  const toggleShowKey = (pId) => {
    setShowKeys((prev) => ({ ...prev, [pId]: !prev[pId] }));
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
        setMessage({ type: 'success', text: `✓ Archivo de contexto ${action === 'add' ? 'agregado' : 'removido'}` });
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

  const handleToggleSkill = async (skillName, enabled) => {
    try {
      const res = await fetch('/api/skills/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_name: skillName, enabled })
      });
      if (res.ok) {
        await fetchConfig();
        onStateRefresh?.();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al conmutar habilidad' });
    }
  };

  const isScrumActive = Boolean(config?.scrum_active);
  const isEscribaActive = Boolean(config?.escriba_active);
  const hasAnyToolActive = isScrumActive || isEscribaActive;

  return (
    <div className="full-view-container">
      <div className="view-header">
        <div className="view-title-group">
          <div>
            <h1 className="view-title">Configuración Global Nexus OS v7.0</h1>
            <p className="view-subtitle">
              {hasAnyToolActive
                ? 'Administración completa de proveedores de IA, claves API, enrutamiento híbrido, límites de contexto y RAG'
                : 'Administración de proveedores de IA, claves API, modelo conversacional y límites de contexto'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Todo'}
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('chat')}>
            ➔ Volver al Chat
          </button>
        </div>
      </div>

      <div className="view-tabs-bar">
        <button 
          className={`view-tab-btn ${activeTab === 'providers' ? 'active' : ''}`}
          onClick={() => setActiveTab('providers')}
        >
          Proveedores y API Keys ({ALL_PROVIDERS.length})
        </button>
        {isScrumActive && (
          <button 
            className={`view-tab-btn ${activeTab === 'hybrid' ? 'active' : ''}`}
            onClick={() => setActiveTab('hybrid')}
          >
            Enrutamiento Híbrido
          </button>
        )}
        <button 
          className={`view-tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          Apariencia y Tema ({theme === 'liquid_glass' ? 'Liquid Glass' : 'Predeterminado'})
        </button>
        <button 
          className={`view-tab-btn ${activeTab === 'limits' ? 'active' : ''}`}
          onClick={() => setActiveTab('limits')}
        >
          {hasAnyToolActive ? 'Límites, RAG y Parámetros' : 'Límites y Parámetros'}
        </button>
        <button 
          className={`view-tab-btn ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          Archivos de Contexto ({config?.context_files?.length || 0})
        </button>
        <button 
          className={`view-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          Habilidades ({config?.active_skills?.length || 0})
        </button>
      </div>

      <div className="view-content">
        {message && (
          <div className={`alert-banner alert-${message.type}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="panel-loading">Cargando configuración del sistema...</div>
        ) : (
          <div className="view-cards-grid">
            {/* TAB 1: PROVEEDORES Y API KEYS */}
            {activeTab === 'providers' && (
              <>
                <div className="view-card full-width-card">
                  <h3>Proveedor Lead Global y Modelo Principal</h3>
                  <div className="settings-form" style={{ marginTop: '16px' }}>
                    <div className="form-group-row">
                      <div className="form-group">
                        <label className="form-label">Proveedor Lead Global</label>
                        <select 
                          className="input-field"
                          value={provider}
                          onChange={(e) => setProvider(e.target.value)}
                        >
                          {ALL_PROVIDERS.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Modelo Lead Global</label>
                        <input 
                          type="text"
                          className="input-field"
                          placeholder="ej: qwen2.5-coder:latest, gpt-4o, claude-3-5-sonnet-20241022"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="view-card full-width-card">
                  <h3>Catálogo Completo de Proveedores de IA ({ALL_PROVIDERS.length})</h3>
                  <p className="view-subtitle" style={{ marginBottom: '16px' }}>
                    Configure las claves API y los endpoints Base URL para cada servicio. Todos se guardan cifrados con seguridad en `.env`.
                  </p>

                  <div className="providers-settings-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {ALL_PROVIDERS.map((p) => {
                      const currentKey = apiKeys[p.id] || '';
                      const currentUrl = baseUrls[p.id] || '';
                      const isMasked = !showKeys[p.id];
                      const isCurrentGlobal = provider === p.id;

                      return (
                        <div 
                          key={p.id} 
                          className="provider-config-item"
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            background: isCurrentGlobal ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            border: isCurrentGlobal ? '1px solid var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <strong style={{ fontSize: '1.05rem' }}>{p.label}</strong>
                              {isCurrentGlobal && (
                                <span className="status-badge status-active" style={{ marginLeft: '10px' }}>
                                  Lead Global Activo
                                </span>
                              )}
                            </div>
                            <span className="form-hint">ID interno: {p.id}</span>
                          </div>

                          <div className="form-group-row">
                            {p.requiresKey ? (
                              <div className="form-group">
                                <label className="form-label">API Key ({p.id.toUpperCase()}_API_KEY)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <input 
                                    type={isMasked ? 'password' : 'text'}
                                    className="input-field"
                                    placeholder={`Ingresar API Key de ${p.id}...`}
                                    value={currentKey}
                                    onChange={(e) => handleApiKeyChange(p.id, e.target.value)}
                                  />
                                  <button 
                                    type="button" 
                                    className="btn btn-outline"
                                    onClick={() => toggleShowKey(p.id)}
                                  >
                                    {isMasked ? 'Mostrar' : 'Ocultar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="form-group">
                                <label className="form-label">API Key</label>
                                <input 
                                  type="text"
                                  className="input-field"
                                  value="No requiere clave API (Local)"
                                  disabled
                                />
                              </div>
                            )}

                            <div className="form-group">
                              <label className="form-label">Base URL / Endpoint</label>
                              <input 
                                type="text"
                                className="input-field"
                                placeholder={`Default: ${p.defaultUrl || 'Autodetectado'}`}
                                value={currentUrl}
                                onChange={(e) => handleBaseUrlChange(p.id, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '20px' }}>
                    <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
                      {saving ? 'Guardando Proveedores...' : 'Guardar Proveedores y Claves API'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* TAB: APARIENCIA Y TEMA */}
            {activeTab === 'appearance' && (
              <div className="view-card full-width-card">
                <h3>Apariencia y Tema Visual de Nexus OS</h3>
                <p className="view-subtitle" style={{ marginBottom: '20px' }}>
                  El sistema Nexus OS soporta exactamente 2 estilos visuales unificados. Seleccione o alterne la estética visual del sistema.
                </p>

                <div className="settings-form" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label className="form-label">Tema del Sistema</label>
                      <select 
                        className="input-field"
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                      >
                        <option value="default">Nexus Default (Tema Oscuro Limpio y Minimalista)</option>
                        <option value="liquid_glass">Liquid Glass (Vidrio Líquido - Cristal Translúcido & Acentos Bioluminiscentes)</option>
                      </select>
                      <span className="form-hint" style={{ marginTop: '8px', display: 'block' }}>
                        {theme === 'liquid_glass' 
                          ? '✨ Estilo Liquid Glass activo: Paneles de cristal translúcido, desenfoque de fondo y acentos cian/violeta.'
                          : ' Estilo Predeterminado activo: Interfaz oscura limpia, rápida y de alto contraste.'}
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                      <label className="switch-toggle">
                        <input 
                          type="checkbox"
                          checked={theme === 'liquid_glass'}
                          onChange={(e) => setTheme(e.target.checked ? 'liquid_glass' : 'default')}
                        />
                        <span className="slider round" />
                      </label>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                        Activar Estilo Liquid Glass (Vidrio Líquido)
                      </span>
                    </label>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
                      {saving ? 'Guardando Tema...' : 'Guardar Configuración de Apariencia'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ENRUTAMIENTO HÍBRIDO */}
            {activeTab === 'hybrid' && (
              <div className="view-card full-width-card">
                <h3>Enrutamiento Híbrido del Enjambre (Swarm Model Routing)</h3>
                <p className="view-subtitle" style={{ marginBottom: '20px' }}>
                  Permite asignar distintos proveedores y modelos especializados para Planificadores (Scrum Master/Arquitecto), Ejecutores (Devs), Auditoría QA y Subagentes.
                </p>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <label className="switch-toggle">
                      <input 
                        type="checkbox"
                        checked={useHybrid}
                        onChange={(e) => setUseHybrid(e.target.checked)}
                      />
                      <span className="slider round" />
                    </label>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                      Activar Sistema Enjambre Híbrido (Dynamic Role Routing)
                    </span>
                  </label>
                </div>

                {useHybrid ? (
                  <div className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Modelo Planificador */}
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>1. Modelo Planificador / Arquitectura Nube</h4>
                      <p className="form-hint" style={{ marginBottom: '12px' }}>
                        Utilizado por: @architect_software, @product_owner, @scrum_master, @ego
                      </p>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label className="form-label">Proveedor Planificador</label>
                          <select 
                            className="input-field"
                            value={plannerProvider}
                            onChange={(e) => setPlannerProvider(e.target.value)}
                          >
                            {ALL_PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Modelo Planificador</label>
                          <input 
                            type="text"
                            className="input-field"
                            value={plannerModel}
                            onChange={(e) => setPlannerModel(e.target.value)}
                            placeholder="ej: gemini-3.6-flash, gpt-4o, claude-3-5-sonnet-20241022"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Modelo Ejecutor */}
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>2. Modelo Ejecutor / Desarrollo Local</h4>
                      <p className="form-hint" style={{ marginBottom: '12px' }}>
                        Utilizado por: @backend_dev, @frontend_dev, @developer, @ui_designer
                      </p>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label className="form-label">Proveedor Ejecutor</label>
                          <select 
                            className="input-field"
                            value={executorProvider}
                            onChange={(e) => setExecutorProvider(e.target.value)}
                          >
                            {ALL_PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Modelo Ejecutor</label>
                          <input 
                            type="text"
                            className="input-field"
                            value={executorModel}
                            onChange={(e) => setExecutorModel(e.target.value)}
                            placeholder="ej: qwen2.5-coder:latest, deepseek-coder"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Modelo QA / Auditoría */}
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>3. Modelo Auditoría y QA</h4>
                      <p className="form-hint" style={{ marginBottom: '12px' }}>
                        Utilizado por: @qa_engineer, @security_auditor, @sentinel
                      </p>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label className="form-label">Proveedor QA / Auditoría</label>
                          <select 
                            className="input-field"
                            value={qaProvider}
                            onChange={(e) => setQaProvider(e.target.value)}
                          >
                            {ALL_PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Modelo QA / Auditoría</label>
                          <input 
                            type="text"
                            className="input-field"
                            value={qaModel}
                            onChange={(e) => setQaModel(e.target.value)}
                            placeholder="ej: llama-3.3-70b-versatile, gpt-4o-mini"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Modelo de Subagentes */}
                    <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                      <h4 style={{ margin: '0 0 12px 0' }}>4. Modelo de Subagentes (Investigación Paralela)</h4>
                      <p className="form-hint" style={{ marginBottom: '12px' }}>
                        Utilizado por los trabajadores en segundo plano y agentes delegados.
                      </p>
                      <div className="form-group-row">
                        <div className="form-group">
                          <label className="form-label">Proveedor Subagentes</label>
                          <select 
                            className="input-field"
                            value={subagentProvider}
                            onChange={(e) => setSubagentProvider(e.target.value)}
                          >
                            {ALL_PROVIDERS.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Modelo Subagentes</label>
                          <input 
                            type="text"
                            className="input-field"
                            value={subagentModel}
                            onChange={(e) => setSubagentModel(e.target.value)}
                            placeholder="ej: qwen2.5-coder:latest"
                          />
                        </div>
                      </div>
                    </div>

                    <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
                      {saving ? 'Guardando Enrutamiento...' : 'Guardar Enrutamiento Híbrido'}
                    </button>
                  </div>
                ) : (
                  <div className="empty-state-text">
                    El modo Enjambre Híbrido está desactivado. Todo el tráfico utilizará exclusivamente el Proveedor y Modelo Lead Global configurado en la primera pestaña.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LÍMITES, RAG Y PARÁMETROS */}
            {activeTab === 'limits' && (
              <div className="view-card full-width-card">
                <h3>Límites de Contexto, RAG e Hiperparámetros</h3>
                <div className="settings-form" style={{ marginTop: '16px' }}>
                  <div className="form-group-row">
                    <div className="form-group">
                      <label className="form-label">Límite Contexto Nube (tokens)</label>
                      <input 
                        type="number"
                        className="input-field"
                        min="1024"
                        value={contextLimit}
                        onChange={(e) => setContextLimit(e.target.value)}
                      />
                      <span className="form-hint">Mínimo: 1024 tokens</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Límite Contexto Local (tokens)</label>
                      <input 
                        type="number"
                        className="input-field"
                        min="512"
                        value={localContextLimit}
                        onChange={(e) => setLocalContextLimit(e.target.value)}
                      />
                      <span className="form-hint">Mínimo: 512 tokens</span>
                    </div>
                  </div>

                  {hasAnyToolActive && (
                    <div className="form-group-row">
                      <div className="form-group">
                        <label className="form-label">Umbral de Relevancia RAG</label>
                        <input 
                          type="number"
                          step="0.1"
                          className="input-field"
                          value={relevanceThreshold}
                          onChange={(e) => setRelevanceThreshold(e.target.value)}
                        />
                        <span className="form-hint">Filtro de similitud coseno / distancia L2</span>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Modelo de Embeddings RAG</label>
                        <input 
                          type="text"
                          className="input-field"
                          value={embedModel}
                          onChange={(e) => setEmbedModel(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

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

                  {isScrumActive && (
                    <div className="form-group">
                      <label className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: '12px 0' }}>
                        <label className="switch-toggle">
                          <input 
                            type="checkbox"
                            checked={showGuides}
                            onChange={(e) => setShowGuides(e.target.checked)}
                          />
                          <span className="slider round" />
                        </label>
                        <span style={{ fontWeight: 600 }}>
                          Mostrar Guías de Inicio y Metodología Jellyfish en Nuevos Chats
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">System Prompt Personalizado del Sistema</label>
                    <textarea 
                      className="input-field textarea-field"
                      rows="4"
                      placeholder="Instrucciones globales base para todos los modelos del sistema Nexus OS..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                    />
                  </div>

                  <button type="button" className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
                    {saving ? 'Guardando Límites...' : 'Guardar Límites y Parámetros'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: ARCHIVOS DE CONTEXTO */}
            {activeTab === 'context' && (
              <>
                <div className="view-card">
                  <h3>Cargar Archivo en el Contexto Activo</h3>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (newContextPath) handleContextFileAction('add', newContextPath);
                    }} 
                    className="rag-doc-form inline-form"
                    style={{ marginTop: '12px' }}
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

                <div className="view-card">
                  <h3>Archivos Cargados Actualmente ({config?.context_files?.length || 0})</h3>
                  {config?.context_files?.length === 0 ? (
                    <div className="empty-state-text" style={{ marginTop: '12px' }}>
                      No hay archivos cargados explícitamente en el contexto.
                    </div>
                  ) : (
                    <ul className="file-list" style={{ marginTop: '12px' }}>
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
              </>
            )}

            {/* TAB 5: HABILIDADES (SKILLS) */}
            {activeTab === 'skills' && (
              <div className="view-card full-width-card">
                <h3>Habilidades (Skills) Registradas</h3>
                {config?.available_skills?.length === 0 ? (
                  <div className="empty-state-text" style={{ marginTop: '12px' }}>
                    No hay habilidades registradas en este agente.
                  </div>
                ) : (
                  <div className="skills-grid" style={{ marginTop: '16px' }}>
                    {config?.available_skills?.map((skill) => (
                      <div key={skill.name} className="skill-card">
                        <div className="skill-info">
                          <span className="skill-name">{skill.name}</span>
                          <span className="skill-desc">{skill.description || 'Sin descripción'}</span>
                        </div>
                        <label className="switch-toggle">
                          <input 
                            type="checkbox"
                            checked={skill.enabled}
                            onChange={(e) => handleToggleSkill(skill.name, e.target.checked)}
                          />
                          <span className="slider round" />
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

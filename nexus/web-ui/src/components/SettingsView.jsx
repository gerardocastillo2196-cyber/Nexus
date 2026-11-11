import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import EscribaMarkdownRenderer from './EscribaMarkdownRenderer';

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

  // Estados de exploración y gestión de Skills
  const [selectedAgency, setSelectedAgency] = useState('All');
  const [ecosystemFilter, setEcosystemFilter] = useState('auto');
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [inspectingSkill, setInspectingSkill] = useState(null);
  const [skillDetailContent, setSkillDetailContent] = useState('');
  const [loadingSkillDetail, setLoadingSkillDetail] = useState(false);

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
        setMessage({ type: 'success', text: '[OK] Toda la configuración se guardó en .env y se aplicó al sistema' });
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

  const modalScrollRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && inspectingSkill) {
        setInspectingSkill(null);
      }
    };
    if (inspectingSkill) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inspectingSkill]);

  const handleInspectSkill = async (skill) => {
    setInspectingSkill(skill);
    setLoadingSkillDetail(true);
    setSkillDetailContent('');
    try {
      const targetId = skill.skill_id || skill.id || skill.slug || skill.name;
      const res = await fetch(`/api/skills/detail/${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = await res.json();
        setSkillDetailContent(data.instructions || data.description || 'Sin instrucciones adicionales.');
      } else {
        setSkillDetailContent(skill.description || 'No se pudieron cargar las instrucciones.');
      }
    } catch (err) {
      setSkillDetailContent(skill.description || 'Error al conectar con el servidor.');
    } finally {
      setLoadingSkillDetail(false);
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }
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
            Volver al Chat
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
                          ? 'Estilo Liquid Glass activo: Paneles de cristal translúcido, desenfoque de fondo y acentos cian/violeta.'
                          : 'Estilo Predeterminado activo: Interfaz oscura limpia, rápida y de alto contraste.'}
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
            {activeTab === 'skills' && (() => {
              const allSkills = config?.available_skills || [];
              const isEscriba = Boolean(config?.escriba_active);
              const isScrum = Boolean(config?.scrum_active) && !isEscriba;
              const activeEngine = isEscriba ? 'escriba' : (isScrum ? 'jellyfish' : 'nexus');
              const currentEcosystem = ecosystemFilter === 'auto' ? activeEngine : ecosystemFilter;

              const matchEcosystem = (skill, eco) => {
                if (eco === 'all') return true;
                const sEco = (skill.ecosystem || '').toLowerCase();
                const agency = skill.agency || '';
                if (eco === 'escriba') {
                  return sEco === 'escriba' || agency === 'Creative';
                }
                if (eco === 'jellyfish') {
                  // Jellyfish tiene acceso a sus propias habilidades de ingeniería Y a las de Nexus (Research, Legal & Media, Marketing)
                  return sEco === 'jellyfish' || sEco === 'nexus' || agency !== 'Creative';
                }
                if (eco === 'nexus') {
                  return sEco === 'nexus' || ['Research', 'Legal & Media', 'Marketing'].includes(agency);
                }
                return true;
              };

              // Skills filtradas por ecosistema (Escriba / Jellyfish / Nexus)
              const ecosystemSkills = allSkills.filter(s => matchEcosystem(s, currentEcosystem));
              
              // Agencias presentes en este ecosistema específico
              const ecosystemAgencies = ['All', ...Array.from(new Set(ecosystemSkills.map(s => s.agency || 'Default'))).sort()];

              // Filtrado final con búsqueda y agencia
              const filteredSkills = ecosystemSkills.filter(skill => {
                const matchesAgency = selectedAgency === 'All' || skill.agency === selectedAgency;
                const matchesSearch = !skillSearchQuery.trim() || (
                  skill.name.toLowerCase().includes(skillSearchQuery.toLowerCase()) ||
                  (skill.description && skill.description.toLowerCase().includes(skillSearchQuery.toLowerCase())) ||
                  (skill.role && skill.role.toLowerCase().includes(skillSearchQuery.toLowerCase())) ||
                  (skill.keywords && skill.keywords.some(k => k.toLowerCase().includes(skillSearchQuery.toLowerCase())))
                );
                return matchesAgency && matchesSearch;
              });

              const activeCount = ecosystemSkills.filter(s => s.enabled).length;

              const getAgencyColor = (agency) => {
                const map = {
                  'Creative': '#818cf8',
                  'Development': '#38bdf8',
                  'DevOps': '#fb923c',
                  'Frontend': '#34d399',
                  'Legal & Media': '#f472b6',
                  'Management': '#60a5fa',
                  'Marketing': '#f87171',
                  'Research': '#2dd4bf'
                };
                return map[agency] || '#a78bfa';
              };

              // Counts por ecosistema para los botones superiores
              const escribaCount = allSkills.filter(s => matchEcosystem(s, 'escriba')).length;
              const jellyfishCount = allSkills.filter(s => matchEcosystem(s, 'jellyfish')).length;
              const nexusCount = allSkills.filter(s => matchEcosystem(s, 'nexus')).length;

              return (
                <div className="view-card full-width-card" style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px' }}>
                  {/* Header & Stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '18px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc' }}>
                          Catálogo de Habilidades (Skills) Especializadas
                        </h3>
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: 700 }}>
                          {ecosystemSkills.length} en este modo ({allSkills.length} total)
                        </span>
                        <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', fontWeight: 700 }}>
                          {activeCount} activas
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                        Inyección selectiva de metodologías, anti-patrones y ejecución programática según el motor activo.
                      </p>
                    </div>

                    {/* Search Bar */}
                    <div style={{ minWidth: '260px' }}>
                      <input
                        type="text"
                        placeholder="Buscar por nombre, rol o keyword..."
                        value={skillSearchQuery}
                        onChange={(e) => setSkillSearchQuery(e.target.value)}
                        style={{
                          width: '100%', padding: '8px 14px', borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#fff', fontSize: '13px', outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  {/* Banner de Filtrado por Ecosistema (Modo Activo) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: currentEcosystem === 'escriba'
                      ? 'rgba(249, 115, 22, 0.10)'
                      : currentEcosystem === 'jellyfish'
                        ? 'rgba(56, 189, 248, 0.10)'
                        : 'rgba(168, 85, 247, 0.10)',
                    border: currentEcosystem === 'escriba'
                      ? '1px solid rgba(249, 115, 22, 0.25)'
                      : currentEcosystem === 'jellyfish'
                        ? '1px solid rgba(56, 189, 248, 0.25)'
                        : '1px solid rgba(168, 85, 247, 0.25)',
                    marginBottom: '20px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                        {currentEcosystem === 'escriba'
                          ? 'Ecosistema Activo: ESCRIBA (Motor Narrativo)'
                          : currentEcosystem === 'jellyfish'
                            ? 'Ecosistema Activo: JELLYFISH (Motor Ágil / Scrum)'
                            : currentEcosystem === 'all'
                              ? 'Catálogo Completo (Todos los Ecosistemas)'
                              : 'Ecosistema Activo: NEXUS (Conversacional Neutral)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {currentEcosystem === 'escriba'
                          ? 'Viendo habilidades de creación literaria, arquetipos y simulación de tramas.'
                          : currentEcosystem === 'jellyfish'
                            ? 'Viendo habilidades de ingeniería (Dev, DevOps, Frontend, Scrum) y de soporte estratégico/técnico de Nexus.'
                            : currentEcosystem === 'all'
                              ? 'Viendo todas las habilidades registradas en el sistema sin filtros de motor.'
                              : 'Viendo habilidades de investigación, análisis legal y marketing.'}
                      </div>
                    </div>

                    {/* Botones de conmutación de ecosistema */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => { setEcosystemFilter('auto'); setSelectedAgency('All'); }}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', border: ecosystemFilter === 'auto' ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                          background: ecosystemFilter === 'auto' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.03)',
                          color: ecosystemFilter === 'auto' ? '#93c5fd' : '#cbd5e1', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        Modo Activo ({activeEngine.toUpperCase()})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEcosystemFilter('escriba'); setSelectedAgency('All'); }}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', border: ecosystemFilter === 'escriba' ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.1)',
                          background: ecosystemFilter === 'escriba' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255,255,255,0.03)',
                          color: ecosystemFilter === 'escriba' ? '#fdba74' : '#cbd5e1', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        ESCRIBA ({escribaCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEcosystemFilter('jellyfish'); setSelectedAgency('All'); }}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', border: ecosystemFilter === 'jellyfish' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                          background: ecosystemFilter === 'jellyfish' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.03)',
                          color: ecosystemFilter === 'jellyfish' ? '#7dd3fc' : '#cbd5e1', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        JELLYFISH ({jellyfishCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEcosystemFilter('nexus'); setSelectedAgency('All'); }}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', border: ecosystemFilter === 'nexus' ? '1px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                          background: ecosystemFilter === 'nexus' ? 'rgba(192, 132, 252, 0.3)' : 'rgba(255,255,255,0.03)',
                          color: ecosystemFilter === 'nexus' ? '#e9d5ff' : '#cbd5e1', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        NEXUS ({nexusCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEcosystemFilter('all'); setSelectedAgency('All'); }}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', border: ecosystemFilter === 'all' ? '1px solid #a3e635' : '1px solid rgba(255,255,255,0.1)',
                          background: ecosystemFilter === 'all' ? 'rgba(163, 230, 53, 0.25)' : 'rgba(255,255,255,0.03)',
                          color: ecosystemFilter === 'all' ? '#d9f99d' : '#cbd5e1', fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        Todas ({allSkills.length})
                      </button>
                    </div>
                  </div>

                  {/* Agency Filter Pills */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>
                      Filtrar por Agencia ({ecosystemAgencies.length > 1 ? ecosystemAgencies.length - 1 : 1} disponibles):
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {ecosystemAgencies.map(agency => {
                        const count = agency === 'All' ? ecosystemSkills.length : ecosystemSkills.filter(s => s.agency === agency).length;
                        const isSelected = selectedAgency === agency;
                        return (
                          <button
                            key={agency}
                            type="button"
                            onClick={() => setSelectedAgency(agency)}
                            style={{
                              padding: '6px 14px', borderRadius: '20px', border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                              background: isSelected ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                              color: isSelected ? '#93c5fd' : '#94a3b8',
                              fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <span>{agency === 'All' ? `Todas (${ecosystemSkills.length} skills)` : agency}</span>
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0' }}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skills Grid */}
                  {filteredSkills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                      No se encontraron habilidades que coincidan con los criterios de búsqueda.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                      {filteredSkills.map((skill) => {
                        const agencyColor = getAgencyColor(skill.agency);
                        const targetId = skill.skill_id || skill.slug || skill.name;
                        return (
                          <div
                            key={skill.name}
                            style={{
                              background: skill.enabled ? 'rgba(30, 41, 59, 0.5)' : 'rgba(15, 23, 42, 0.4)',
                              border: skill.enabled ? `1px solid ${agencyColor}44` : '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column',
                              justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s ease'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                <div>
                                  <span style={{
                                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    color: agencyColor, padding: '2px 8px', borderRadius: '6px', background: `${agencyColor}15`,
                                    border: `1px solid ${agencyColor}30`, display: 'inline-block', marginBottom: '4px'
                                  }}>
                                    {skill.agency || 'General'}
                                  </span>
                                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                                    {skill.name}
                                  </h4>
                                </div>
                                
                                <label className="switch-toggle" style={{ margin: 0 }}>
                                  <input 
                                    type="checkbox"
                                    checked={skill.enabled}
                                    onChange={(e) => handleToggleSkill(targetId, e.target.checked)}
                                  />
                                  <span className="slider round" />
                                </label>
                              </div>

                              {skill.role && (
                                <div style={{ marginBottom: '8px' }}>
                                  <span style={{ fontSize: '11px', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                    Rol: {skill.role}
                                  </span>
                                </div>
                              )}

                              <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.45 }}>
                                {skill.description || 'Habilidad con directrices de razonamiento e inyección contextual.'}
                              </p>

                              {/* Keywords chips */}
                              {skill.keywords && skill.keywords.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {skill.keywords.slice(0, 4).map((kw, i) => (
                                    <span key={i} style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }}>
                                      #{kw}
                                    </span>
                                  ))}
                                  {skill.keywords.length > 4 && (
                                    <span style={{ fontSize: '10px', color: '#64748b', alignSelf: 'center' }}>
                                      +{skill.keywords.length - 4} más
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Card Footer */}
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px'
                            }}>
                              <span style={{
                                fontSize: '11px',
                                color: skill.enabled ? '#4ade80' : '#64748b',
                                fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: '6px'
                              }}>
                                <span style={{
                                  width: '6px', height: '6px', borderRadius: '50%',
                                  background: skill.enabled ? '#4ade80' : '#475569',
                                  display: 'inline-block'
                                }} />
                                {skill.enabled ? 'Activa en Prompt' : 'En reposo'}
                              </span>
                              <button
                                onClick={() => handleInspectSkill(skill)}
                                style={{
                                  padding: '5px 12px', borderRadius: '6px',
                                  background: 'rgba(59, 130, 246, 0.08)',
                                  border: '1px solid rgba(59, 130, 246, 0.2)',
                                  color: '#93c5fd', fontSize: '11px', fontWeight: 600,
                                  cursor: 'pointer', transition: 'all 0.15s ease',
                                  letterSpacing: '0.01em'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'; }}
                              >
                                Ver Directrices
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Modal de Inspección de Directrices con React Portal para centrado absoluto en viewport */}
                  {inspectingSkill && typeof document !== 'undefined' && createPortal(
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(5, 8, 18, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        zIndex: 999999,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '20px',
                        boxSizing: 'border-box'
                      }}
                      onClick={() => setInspectingSkill(null)}
                    >
                      <div
                        style={{
                          background: 'linear-gradient(180deg, #131d31 0%, #0a0f1d 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '16px',
                          width: '100%',
                          maxWidth: '820px',
                          maxHeight: '86vh',
                          height: '78vh',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 32px 80px -16px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.06) inset',
                          overflow: 'hidden'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Modal Header Compacto y Elegante */}
                        <div style={{
                          padding: '16px 24px',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexShrink: 0
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              padding: '3px 10px',
                              borderRadius: '6px',
                              background: `${getAgencyColor(inspectingSkill.agency)}18`,
                              color: getAgencyColor(inspectingSkill.agency),
                              border: `1px solid ${getAgencyColor(inspectingSkill.agency)}35`
                            }}>
                              {inspectingSkill.agency}
                            </span>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                              {inspectingSkill.name}
                            </h3>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '5px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              color: '#93c5fd',
                              border: '1px solid rgba(59, 130, 246, 0.22)'
                            }}>
                              {inspectingSkill.role || '@default'}
                            </span>
                          </div>

                          <button
                            onClick={() => setInspectingSkill(null)}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '8px',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                              padding: '6px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              flexShrink: 0
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                              e.currentTarget.style.color = '#fca5a5';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.color = '#94a3b8';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                            }}
                          >
                            Cerrar
                          </button>
                        </div>

                        {/* Keywords Subbar */}
                        {inspectingSkill.keywords && inspectingSkill.keywords.length > 0 && (
                          <div style={{
                            padding: '8px 24px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap',
                            flexShrink: 0
                          }}>
                            <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Keywords:</span>
                            {inspectingSkill.keywords.map((kw, i) => (
                              <span key={i} style={{
                                fontSize: '10.5px',
                                padding: '1px 7px',
                                borderRadius: '4px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                color: '#94a3b8'
                              }}>
                                #{kw}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Modal Body — Markdown Content con Scroll Autocontenido */}
                        <div
                          ref={modalScrollRef}
                          style={{
                            padding: '24px 28px',
                            overflowY: 'auto',
                            flex: 1,
                            fontSize: '13.5px',
                            lineHeight: 1.65,
                            color: '#e2e8f0'
                          }}
                        >
                          {loadingSkillDetail ? (
                            <div style={{
                              textAlign: 'center',
                              padding: '50px 16px',
                              color: '#64748b',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '12px'
                            }}>
                              <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.1)',
                                borderTopColor: '#3b82f6',
                                animation: 'spin 0.8s linear infinite'
                              }} />
                              <span>Cargando directrices de razonamiento...</span>
                            </div>
                          ) : skillDetailContent ? (
                            <EscribaMarkdownRenderer content={skillDetailContent} />
                          ) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                              Esta habilidad no tiene directrices documentadas.
                            </div>
                          )}
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                          padding: '12px 24px',
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'rgba(0,0,0,0.25)',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            Identificador: {inspectingSkill.skill_id || inspectingSkill.id || inspectingSkill.slug}
                          </span>
                          <button
                            onClick={() => setInspectingSkill(null)}
                            style={{
                              padding: '6px 18px',
                              borderRadius: '7px',
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              color: '#93c5fd',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              flexShrink: 0
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.28)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
                          >
                            Entendido
                          </button>
                        </div>
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </div>
  );
}

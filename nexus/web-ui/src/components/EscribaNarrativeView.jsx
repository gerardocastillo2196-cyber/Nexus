import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'domino', label: 'Simulador Dominó', icon: '', subtitle: 'Simulación What-If de Ruptura de Alianzas' },
  { id: 'historical', label: 'Análisis Histórico', icon: '', subtitle: 'Radiografía Geopolítica y Socioeconómica' },
  { id: 'voids', label: 'Detector de Vacíos', icon: '', subtitle: 'Topología Narrativa y Arcos Puente' },
  { id: 'audit', label: 'Auditoría de Trama', icon: '', subtitle: 'Continuity Supervisor & Fixes' },
  { id: 'builder', label: 'Creador de Protocolos', icon: '', subtitle: 'Análisis Personalizados con Prompts Propios' }
];

export default function EscribaNarrativeView({ onNavigate, onSendMessage }) {
  const [activeTab, setActiveTab] = useState('domino');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Common execution state
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);

  // Domino form state
  const [dominoTarget, setDominoTarget] = useState('');
  const [dominoEventText, setDominoEventText] = useState('');

  // Historical analysis module selector
  const [selectedModules, setSelectedModules] = useState([
    'cronologia', 'geopolitica', 'socioeconomia', 'creencias', 'tecnologia', 'vacios'
  ]);

  // General prompt/input text
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    fetch('/api/escriba/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(err => console.error('Error cargando grafo:', err));
  }, []);

  const handleRunTask = async (mode) => {
    setLoading(true);
    setResultData(null);

    try {
      const payload = {
        mode: mode,
        text: customText,
        target_label: dominoTarget,
        event_text: dominoEventText,
        selected_modules: selectedModules
      };

      const res = await fetch('/api/escriba/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setResultData(data);
      } else {
        const err = await res.json();
        setResultData({ status: 'error', detail: err.detail || 'Error en el servidor' });
      }
    } catch (err) {
      setResultData({ status: 'error', detail: 'Error de conexión con el motor ESCRIBA' });
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (modId) => {
    if (selectedModules.includes(modId)) {
      setSelectedModules(selectedModules.filter(m => m !== modId));
    } else {
      setSelectedModules([...selectedModules, modId]);
    }
  };

  return (
    <div className="view-container escriba-narrative-container" style={{ padding: '24px', color: '#f8fafc', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ESCRIBA — Configuración Narrativa e Historia
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Simulador de Ruptura de Alianzas, Radiografía Histórica y Auditoría Literaria de Continuidad.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResultData(null); }}
              style={{
                flex: 1, minWidth: '180px', padding: '14px', borderRadius: '10px', cursor: 'pointer',
                background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%)' : '#0f172a',
                border: isActive ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: isActive ? '#a5b4fc' : '#fff', fontSize: '14px' }}>{tab.label}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{tab.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div style={{ display: 'grid', gridTemplateColumns: resultData ? '1fr 1fr' : '1fr', gap: '20px' }}>
        
        {/* Input Configuration Panel */}
        <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* TAB 1: SIMULADOR DOMINÓ */}
          {activeTab === 'domino' && (
            <>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Simulación de Efecto Dominó (What-If)</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Evalúa qué sucede cuando un personaje clave es envenenado, asesinado o derrocado.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Entidad Afectada / Objetivo:</label>
                <select
                  value={dominoTarget}
                  onChange={(e) => setDominoTarget(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
                >
                  <option value="">-- Seleccionar Personaje o Facción --</option>
                  {graphData.nodes.map(n => (
                    <option key={n.id} value={n.label}>{n.label} ({n.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Evento Hipotético Alterador:</label>
                <textarea
                  rows="3"
                  value={dominoEventText}
                  onChange={(e) => setDominoEventText(e.target.value)}
                  placeholder="ej. Es capturado por el Consorcio del Hierro durante la cumbre secreta..."
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <button
                disabled={loading || !dominoTarget || !dominoEventText}
                onClick={() => handleRunTask('simulate_domino')}
                style={{ padding: '12px', background: loading ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Calculando Simulación...' : 'Ejecutar Simulación Dominó'}
              </button>
            </>
          )}

          {/* TAB 2: ANÁLISIS HISTÓRICO Y GEOPOLÍTICO */}
          {activeTab === 'historical' && (
            <>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Radiografía Histórica y Geopolítica</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Selecciona las dimensiones del mundo que deseas analizar a través del LLM:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { id: 'cronologia', label: '1. Cronología Inferida' },
                  { id: 'geopolitica', label: '2. Dinámicas de Poder' },
                  { id: 'socioeconomia', label: '3. Socioeconomía y Recursos' },
                  { id: 'creencias', label: '4. Sistema de Creencias' },
                  { id: 'tecnologia', label: '5. Paradigma Tecnológico' },
                  { id: 'vacios', label: '6. Vacíos Históricos' }
                ].map(mod => {
                  const checked = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      style={{
                        padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                        background: checked ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                        border: checked ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        color: checked ? '#a5b4fc' : '#cbd5e1', fontSize: '13px', fontWeight: checked ? 600 : 400
                      }}
                    >
                      {mod.label}
                    </div>
                  );
                })}
              </div>

              <button
                disabled={loading || selectedModules.length === 0}
                onClick={() => handleRunTask('historical_analysis')}
                style={{ padding: '12px', background: loading ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Generando Reporte Erudito...' : 'Generar Radiografía Histórica'}
              </button>
            </>
          )}

          {/* TAB 3: DETECTOR DE VACÍOS */}
          {activeTab === 'voids' && (
            <>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Detector de Vacíos Narrativos</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Identifica personajes periféricos aislados y propone eventos puente para forzar fricción narrativa.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Instrucciones adicionales o borrador de capítulo:</label>
                <textarea
                  rows="4"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Texto opcional para evaluar si un capítulo recién escrito deja vacíos..."
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <button
                disabled={loading}
                onClick={() => handleRunTask('suggest_voids')}
                style={{ padding: '12px', background: loading ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Escaneando Topología...' : 'Detectar Vacíos Narrativos'}
              </button>
            </>
          )}

          {/* TAB 4: AUDITORÍA DE TRAMA */}
          {activeTab === 'audit' && (
            <>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Auditoría de Trama & Continuidad</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                El Supervisor de Continuidad revisa incongruencias temporales, agujeros de guion y tramas abandonadas.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Manuscrito o síntesis del proyecto a auditar:</label>
                <textarea
                  rows="4"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Inserta aquí el texto del capítulo o arco narrativo..."
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <button
                disabled={loading}
                onClick={() => handleRunTask('plot_audit')}
                style={{ padding: '12px', background: loading ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Auditando Manuscrito...' : 'Iniciar Auditoría de Trama'}
              </button>
            </>
          )}

          {/* TAB 5: CREADOR DE PROTOCOLOS */}
          {activeTab === 'builder' && (
            <>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Creador de Herramientas & Protocolos Analíticos</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                Diseña tu propio lente de análisis literario ingresando un Prompt de Sistema y ejecutándolo sobre el texto.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Nombre de la Herramienta / Protocolo:</label>
                <input
                  type="text"
                  placeholder="ej. Análisis de Subtexto y Traición, Perfil Psicológico..."
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Prompt de Sistema (Instrucción IA):</label>
                <textarea
                  rows="4"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Instrucciones detalladas de cómo la IA debe evaluar el manuscrito..."
                  style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
                />
              </div>

              <button
                disabled={loading || !customText.trim()}
                onClick={() => handleRunTask('custom_protocol')}
                style={{ padding: '12px', background: loading ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Ejecutando Protocolo...' : 'Ejecutar Protocolo Personalizado'}
              </button>
            </>
          )}

        </div>

        {/* Results Panel */}
        {resultData && (
          <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '520px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc' }}>Resultados del Motor ESCRIBA</span>
              <button onClick={() => setResultData(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕ Cerrar</button>
            </div>

            {/* DOMINO SIMULATION RESULT */}
            {resultData.domino && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '12px', borderRadius: '6px' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: '#fca5a5' }}>Resumen del Colapso / Efecto Dominó</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{resultData.domino.report}</p>
                </div>

                {resultData.domino.taking_place?.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#38bdf8' }}>Vacío de Poder / Quien toma el lugar:</strong>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: '13px', color: '#e2e8f0' }}>
                      {resultData.domino.taking_place.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {resultData.domino.broken_alliances?.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#fbbf24' }}>Alianzas Rotas / Rupturas:</strong>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: '13px', color: '#e2e8f0' }}>
                      {resultData.domino.broken_alliances.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}

                {resultData.domino.war_declarations?.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '12px', color: '#f87171' }}>Conflictos / Nuevas Guerras:</strong>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: '13px', color: '#e2e8f0' }}>
                      {resultData.domino.war_declarations.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* RAW TEXT / MARKDOWN RESULTS */}
            {(resultData.analysis || resultData.suggestions || resultData.audit_report || resultData.response || resultData.report) && (
              <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, whitespace: 'pre-wrap' }}>
                {resultData.analysis || resultData.suggestions || resultData.audit_report || resultData.response || resultData.report}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

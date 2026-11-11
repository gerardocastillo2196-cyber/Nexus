import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'escriba_protocols_custom';

const PROTOCOL_PACKS = [
  {
    id: 'pack-historical',
    title: 'Protocolo de Análisis Histórico y Cronológico',
    category: 'Continuidad / Mundo',
    description: 'Revisión exhaustiva de anacronismos, saltos temporales inexplicables y coherencia con la línea de tiempo del universo.',
    systemPrompt: 'Examina rigurosamente la secuencia temporal, genealogías y congruencia cronológica del manuscrito, identificando fechas solapadas y anacronismos tecnológicos o socioculturales.',
    rigor: 'Estricto y Riguroso',
    lenses: ['Lente de Cronología Inferida', 'Lente de Vacíos Históricos', 'Lente de Sombras de Trama'],
    author: 'Motor ESCRIBA Core',
    installed: true
  },
  {
    id: 'pack-geopolitics',
    title: 'Protocolo Geopolítico y Dinámicas de Poder',
    category: 'Facciones / Geopolítica',
    description: 'Análisis del estado de las facciones, monopolio de recursos, estratificación social y lealtades políticas.',
    systemPrompt: 'Evalúa la distribución de poder entre facciones, los monopolios bélicos y económicos, y la verosimilitud de las alianzas políticas frente a las tensiones de clase.',
    rigor: 'Equilibrado',
    lenses: ['Lente de Dinámicas de Poder', 'Lente Socioeconómica', 'Lente de Sistemas de Creencias'],
    author: 'Motor ESCRIBA Core',
    installed: true
  },
  {
    id: 'pack-domino',
    title: 'Motor de Simulación de Efecto Dominó (What-If Engine)',
    category: 'Simulación / Trama',
    description: 'Proyección táctica de alteraciones hipotéticas sobre personajes, ruptura de alianzas y vacíos de poder.',
    systemPrompt: 'Modela la caída o traición de un personaje objetivo, proyectando vacíos de poder inmediatos, rupturas de tratados y declaraciones de guerra resultantes.',
    rigor: 'Estricto y Riguroso',
    lenses: ['Lente de Ruptura de Alianzas', 'Lente de Asunción de Poder', 'Lente de Declaración de Conflicto'],
    author: 'Motor ESCRIBA Core',
    installed: true
  },
  {
    id: 'pack-audit',
    title: 'Auditor Literario y Supervisor de Continuidad',
    category: 'Edición / Manuscrito',
    description: 'Inspección de agujeros de guion, personajes abandonados y sugerencias tácticas para elevar la tensión del clímax.',
    systemPrompt: 'Supervisa el manuscrito buscando discrepancias de vestuario, armas, distancias físicas recorridas, arcos incompletos y promesas de trama no cumplidas.',
    rigor: 'Estricto y Riguroso',
    lenses: ['Lente de Inconsistencias', 'Lente de Personajes Aislados', 'Lente de Cierre Narrativo'],
    author: 'Motor ESCRIBA Core',
    installed: true
  }
];

export default function EscribaSettingsView({ onNavigate }) {
  const [packs, setPacks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error cargando protocolos personalizados:', e);
    }
    return PROTOCOL_PACKS;
  });

  // Cargar protocolos persistidos en el servidor al montar
  useEffect(() => {
    fetch('/api/escriba/protocols')
      .then(res => res.json())
      .then(data => {
        if (data.protocols && Array.isArray(data.protocols) && data.protocols.length > 0) {
          setPacks(data.protocols);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.protocols));
        }
      })
      .catch(err => {
        console.warn('Usando protocolos desde almacenamiento local:', err);
      });
  }, []);

  // Modal de edición y configuración
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState(null);
  const [newLensInput, setNewLensInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Guardar en localStorage y sincronizar con backend
  const persistPacks = async (newPacks) => {
    setPacks(newPacks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPacks));
    } catch (e) {
      console.error('Error guardando protocolos en localStorage:', e);
    }
    try {
      await fetch('/api/escriba/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocols: newPacks })
      });
    } catch (e) {
      console.error('Error sincronizando protocolos con backend:', e);
    }
  };

  const toggleInstall = (packId) => {
    const updated = packs.map(p => p.id === packId ? { ...p, installed: !p.installed } : p);
    persistPacks(updated);
  };

  const handleOpenConfig = (pack) => {
    setEditingPack(JSON.parse(JSON.stringify(pack)));
    setNewLensInput('');
    setSaveSuccessMsg(false);
    setIsModalOpen(true);
  };

  const handleOpenCreateNew = () => {
    const newPack = {
      id: `pack-custom-${Date.now()}`,
      title: 'Nuevo Protocolo de Análisis',
      category: 'Personalizado / Estilo',
      description: 'Describe la finalidad analítica y el enfoque de este protocolo literario.',
      systemPrompt: 'Instrucciones del sistema para la IA: evalúa el texto priorizando la coherencia y el subtexto.',
      rigor: 'Equilibrado',
      lenses: ['Lente de Subtexto', 'Lente de Tensión Dramática'],
      author: 'Usuario Nexus',
      installed: true
    };
    setEditingPack(newPack);
    setNewLensInput('');
    setSaveSuccessMsg(false);
    setIsModalOpen(true);
  };

  const handleAddLens = () => {
    const trimmed = newLensInput.trim();
    if (!trimmed || !editingPack) return;
    if (editingPack.lenses.includes(trimmed)) return;
    setEditingPack({
      ...editingPack,
      lenses: [...editingPack.lenses, trimmed]
    });
    setNewLensInput('');
  };

  const handleRemoveLens = (lensToRemove) => {
    if (!editingPack) return;
    setEditingPack({
      ...editingPack,
      lenses: editingPack.lenses.filter(l => l !== lensToRemove)
    });
  };

  const handleSaveProtocol = () => {
    if (!editingPack) return;
    const exists = packs.some(p => p.id === editingPack.id);
    let updated;
    if (exists) {
      updated = packs.map(p => p.id === editingPack.id ? editingPack : p);
    } else {
      updated = [editingPack, ...packs];
    }
    persistPacks(updated);
    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      setIsModalOpen(false);
    }, 700);
  };

  const handleResetToDefault = (packId) => {
    const defaultPack = PROTOCOL_PACKS.find(p => p.id === packId);
    if (!defaultPack) return;
    setEditingPack(JSON.parse(JSON.stringify(defaultPack)));
  };

  const handleResetAll = async () => {
    if (window.confirm('¿Deseas restaurar todos los protocolos y lentes a sus valores predeterminados de fábrica?')) {
      try {
        const res = await fetch('/api/escriba/protocols/reset', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setPacks(data.protocols || PROTOCOL_PACKS);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.protocols || PROTOCOL_PACKS));
          return;
        }
      } catch (e) {
        console.error('Error en reset de backend:', e);
      }
      persistPacks(PROTOCOL_PACKS);
    }
  };

  return (
    <div className="view-container escriba-settings-container" style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header Pro */}
      <div className="pro-view-header">
        <div>
          <h1 className="pro-view-title escriba-indigo-glow-text">
            Protocolos y Lentes Narrativos de ESCRIBA
          </h1>
          <p className="pro-view-subtitle">
            Gestiona, calibra y personaliza los protocolos y lentes analíticos del motor narrativo.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleResetAll}
            className="pro-btn pro-btn-secondary pro-btn-sm"
            title="Restaurar protocolos de fábrica"
          >
            Restaurar Valores por Defecto
          </button>

          <button
            onClick={handleOpenCreateNew}
            className="pro-btn pro-btn-primary pro-btn-sm"
          >
            <span>+ Crear Nuevo Protocolo</span>
          </button>
        </div>
      </div>

      {/* PROTOCOLS CARDS GRID PRO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`pro-card ${pack.installed ? 'pro-card-active' : ''}`}
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <span className="pro-badge pro-badge-indigo" style={{ marginBottom: '8px' }}>
                  <span className="pro-badge-dot" />
                  {pack.category}
                </span>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff', fontWeight: 700, letterSpacing: '-0.015em' }}>
                  {pack.title}
                </h3>
              </div>
              {pack.installed && (
                <span className="pro-badge pro-badge-emerald">
                  <span className="pro-badge-dot" />
                  Activo
                </span>
              )}
            </div>

            <p style={{
              margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6,
              background: 'rgba(5, 7, 14, 0.5)', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.04)'
            }}>
              {pack.description}
            </p>

            {pack.rigor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#8b95a5' }}>
                <span style={{ fontWeight: 600 }}>Rigor:</span>
                <span className="pro-badge pro-badge-cyan">{pack.rigor}</span>
              </div>
            )}

            <div>
              <span style={{ fontSize: '11px', color: '#8b95a5', display: 'block', marginBottom: '8px', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lentes Narrativos ({pack.lenses?.length || 0}):
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {pack.lenses?.map((lens, idx) => (
                  <span key={idx} style={{
                    fontSize: '11px', background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.2)', padding: '3px 9px',
                    borderRadius: '8px', color: '#c7d2fe', fontWeight: 500
                  }}>
                    {lens}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Por: {pack.author}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenConfig(pack)}
                  className="pro-btn pro-btn-secondary pro-btn-sm"
                  title="Configurar y Modificar este Protocolo"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Configurar</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleInstall(pack.id)}
                  className={`pro-btn pro-btn-sm ${pack.installed ? 'pro-btn-danger' : 'pro-btn-primary'}`}
                >
                  {pack.installed ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE CONFIGURACIÓN Y MEJORA DE PROTOCOLOS Y LENTES PRO */}
      {isModalOpen && editingPack && (
        <div className="pro-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="pro-modal-panel" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="pro-modal-header">
              <div>
                <span className="pro-badge pro-badge-indigo" style={{ marginBottom: '6px' }}>
                  Ajustes de Motor ESCRIBA
                </span>
                <h2 className="pro-modal-title">
                  Configurar Protocolo & Lentes Narrativos
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="pro-btn pro-btn-ghost pro-btn-sm"
              >
                X
              </button>
            </div>

            {/* Form Fields */}
            <div className="pro-modal-body">
              <div className="pro-field-group">
                <label className="pro-field-label">Título del Protocolo:</label>
                <input
                  type="text"
                  value={editingPack.title}
                  onChange={(e) => setEditingPack({ ...editingPack, title: e.target.value })}
                  className="pro-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="pro-field-group">
                  <label className="pro-field-label">Categoría:</label>
                  <input
                    type="text"
                    value={editingPack.category}
                    onChange={(e) => setEditingPack({ ...editingPack, category: e.target.value })}
                    className="pro-input"
                  />
                </div>

                <div className="pro-field-group">
                  <label className="pro-field-label">Rigor de Análisis (Sensibilidad):</label>
                  <select
                    value={editingPack.rigor || 'Equilibrado'}
                    onChange={(e) => setEditingPack({ ...editingPack, rigor: e.target.value })}
                    className="pro-select"
                  >
                    <option value="Estricto y Riguroso">Estricto y Riguroso</option>
                    <option value="Equilibrado">Equilibrado (Recomendado)</option>
                    <option value="Flexible y Exploratorio">Flexible y Exploratorio</option>
                  </select>
                </div>
              </div>

              <div className="pro-field-group">
                <label className="pro-field-label">Descripción Operativa (Qué analiza):</label>
                <textarea
                  rows={2}
                  value={editingPack.description}
                  onChange={(e) => setEditingPack({ ...editingPack, description: e.target.value })}
                  className="pro-textarea"
                />
              </div>

              <div className="pro-field-group">
                <label className="pro-field-label">Directriz del Sistema (Prompt de Evaluación para la IA):</label>
                <textarea
                  rows={3}
                  value={editingPack.systemPrompt || ''}
                  onChange={(e) => setEditingPack({ ...editingPack, systemPrompt: e.target.value })}
                  placeholder="Instrucciones precisas de cómo el LLM debe auditar el texto..."
                  className="pro-textarea"
                />
              </div>

              {/* GESTOR DE LENTES NARRATIVOS */}
              <div style={{ background: 'rgba(5, 7, 14, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#a5b4fc', marginBottom: '10px' }}>
                  Lentes Narrativos Activos en este Protocolo:
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {editingPack.lenses?.map((lens, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{lens}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLens(lens)}
                        className="pro-btn pro-btn-danger pro-btn-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                  {(!editingPack.lenses || editingPack.lenses.length === 0) && (
                    <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                      No hay lentes configurados. Agrega al menos uno para este protocolo.
                    </div>
                  )}
                </div>

                {/* Input para agregar nuevo lente */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newLensInput}
                    onChange={(e) => setNewLensInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLens(); } }}
                    placeholder="Nombre del nuevo lente..."
                    className="pro-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleAddLens}
                    className="pro-btn pro-btn-secondary"
                  >
                    + Agregar Lente
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pro-modal-footer">
              {editingPack.id.startsWith('pack-') && PROTOCOL_PACKS.some(p => p.id === editingPack.id) ? (
                <button
                  type="button"
                  onClick={() => handleResetToDefault(editingPack.id)}
                  style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginRight: 'auto' }}
                >
                  Restaurar a Valores de Fábrica
                </button>
              ) : null}

              {saveSuccessMsg && (
                <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, marginRight: '8px' }}>Guardado correctamente</span>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="pro-btn pro-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProtocol}
                className="pro-btn pro-btn-primary"
              >
                Guardar Modificaciones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


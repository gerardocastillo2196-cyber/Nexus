import React, { useState, useEffect } from 'react';

export default function EscribaEnsembleView({ onNavigate, onSendMessage }) {
  const [activeTab, setActiveTab] = useState('character_debate'); // 'character_debate' | 'model_debate'

  // Model Debate state
  const [dilemmaText, setDilemmaText] = useState('');
  const [loadingModel, setLoadingModel] = useState(false);
  const [debateResult, setDebateResult] = useState(null);

  // Character Debate state
  const [characters, setCharacters] = useState([]);
  const [selectedCharIds, setSelectedCharIds] = useState([]);
  const [scenePrompt, setScenePrompt] = useState('');
  const [loadingCharDebate, setLoadingCharDebate] = useState(false);
  const [charDebateResult, setCharDebateResult] = useState(null);

  useEffect(() => {
    // Cargar personajes del proyecto activo
    fetch('/api/escriba/graph')
      .then(res => res.json())
      .then(data => {
        const nodes = data.nodes || [];
        const charNodes = nodes.filter(n => n.type === 'character' || n.type === 'personaje');
        setCharacters(charNodes);
        if (charNodes.length >= 2) {
          setSelectedCharIds([charNodes[0].id, charNodes[1].id]);
        } else if (charNodes.length === 1) {
          setSelectedCharIds([charNodes[0].id]);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const toggleSelectCharacter = (id) => {
    if (selectedCharIds.includes(id)) {
      setSelectedCharIds(selectedCharIds.filter(i => i !== id));
    } else {
      setSelectedCharIds([...selectedCharIds, id]);
    }
  };

  const handleRunModelDebate = async () => {
    if (!dilemmaText.trim()) return;
    setLoadingModel(true);
    setDebateResult(null);

    try {
      const res = await fetch('/api/escriba/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ensemble_debate',
          text: dilemmaText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDebateResult(data);
      } else {
        setDebateResult({ response: 'Error procesando debate multi-modelo.' });
      }
    } catch (err) {
      setDebateResult({ response: 'Error de conexión con el motor de ensamble.' });
    } finally {
      setLoadingModel(false);
    }
  };

  const handleRunCharacterDebate = async () => {
    if (selectedCharIds.length < 2 || !scenePrompt.trim()) return;
    setLoadingCharDebate(true);
    setCharDebateResult(null);

    try {
      const res = await fetch('/api/escriba/character-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_ids: selectedCharIds,
          scene_prompt: scenePrompt.trim(),
          num_turns: 3
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCharDebateResult(data);
      } else {
        const errData = await res.json();
        setCharDebateResult({ dialogue: `Error: ${errData.detail || 'No se pudo generar el diálogo de personajes.'}` });
      }
    } catch (err) {
      setCharDebateResult({ dialogue: 'Error de conexión con el motor de personajes.' });
    } finally {
      setLoadingCharDebate(false);
    }
  };

  return (
    <div className="view-container escriba-ensemble-container" style={{ padding: '24px', color: '#f8fafc', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
              ESCRIBA — Ensamble Narrativo y Debate Multi-Modelo
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
            Simulación de fricción entre personajes y debate cruzado entre modelos de IA.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('character_debate')}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: activeTab === 'character_debate' ? 'var(--accent-blue, #3b82f6)' : 'var(--bg-tertiary, rgba(255,255,255,0.05))',
            color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
          }}
        >
          Debate entre Personajes
        </button>
        <button
          onClick={() => setActiveTab('model_debate')}
          style={{
            padding: '8px 16px', borderRadius: '6px', border: 'none',
            background: activeTab === 'model_debate' ? 'var(--accent-blue, #3b82f6)' : 'var(--bg-tertiary, rgba(255,255,255,0.05))',
            color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
          }}
        >
          Debate entre Modelos de IA
        </button>
      </div>

      {/* TAB 1: CHARACTER DEBATE */}
      {activeTab === 'character_debate' && (
        <div style={{ display: 'grid', gridTemplateColumns: charDebateResult ? '320px 1fr' : '1fr', gap: '20px' }}>
          <div style={{ background: 'var(--surface-container, #0f172a)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary, #fff)', fontSize: '15px' }}>1. Selecciona Personajes</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Cada personaje actuará según su biografía, matriz de personalidad y alineación en el manuscrito.
              </p>
            </div>

            {characters.length === 0 ? (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                No se encontraron personajes en el proyecto activo.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {characters.map(c => {
                  const isSelected = selectedCharIds.includes(c.id);
                  const attrs = c.attributes || {};
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleSelectCharacter(c.id)}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                        border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#a5b4fc' : '#fff' }}>{c.label}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{attrs.archetype || 'Personaje'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '16px' }}>2. Situación de la Escena o Dilema</h3>
              <textarea
                rows="4"
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder="ej. Confrontación en la sala del trono tras descubrir la traición del consejero real..."
                style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '13px', lineHeight: 1.5 }}
              />
            </div>

            <button
              disabled={loadingCharDebate || selectedCharIds.length < 2 || !scenePrompt.trim()}
              onClick={handleRunCharacterDebate}
              style={{
                padding: '12px', background: (loadingCharDebate || selectedCharIds.length < 2 || !scenePrompt.trim()) ? '#475569' : '#6366f1',
                border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px'
              }}
            >
              {loadingCharDebate ? 'Simulando Diálogo en Escena...' : 'Iniciar Debate & Diálogo de Personajes'}
            </button>
          </div>

          {/* Results Panel */}
          {charDebateResult && (
            <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc' }}>
                  Diálogo de Escena: {charDebateResult.characters?.join(' vs ')}
                </span>
                <button onClick={() => setCharDebateResult(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, whitespace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                {charDebateResult.dialogue}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODEL DEBATE */}
      {activeTab === 'model_debate' && (
        <div style={{ display: 'grid', gridTemplateColumns: debateResult ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Dilema Narrativo o Escena a Debatir</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
              Describe la encrucijada moral, la decisión crítica de un personaje o el conflicto central del capítulo.
            </p>

            <textarea
              rows="6"
              value={dilemmaText}
              onChange={(e) => setDilemmaText(e.target.value)}
              placeholder="ej. ¿Debe el protagonista revelar la alianza secreta a costa de perder la lealtad de la facción rival?"
              style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', fontSize: '14px', lineHeight: 1.6 }}
            />

            <button
              disabled={loadingModel || !dilemmaText.trim()}
              onClick={handleRunModelDebate}
              style={{ padding: '12px', background: loadingModel ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loadingModel ? 'not-allowed' : 'pointer' }}
            >
              {loadingModel ? 'Sometiendo a Debate Multi-Modelo...' : 'Iniciar Debate Narrativo'}
            </button>
          </div>

          {debateResult && (
            <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc' }}>Dictamen del Ensamble Narrativo</span>
                <button onClick={() => setDebateResult(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, whitespace: 'pre-wrap' }}>
                {debateResult.response || debateResult.analysis || 'Debate completado.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

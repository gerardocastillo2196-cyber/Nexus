import React, { useState, useEffect } from 'react';
import EscribaMarkdownRenderer from './EscribaMarkdownRenderer';

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
          num_turns: 4
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

  // Helper para renderizar intervenciones de personajes como burbujas de diálogo
  const renderCharacterDialogue = (dialogueText) => {
    if (!dialogueText) return null;
    const blocks = dialogueText.split(/\n\s*\n/).filter(b => b.trim().length > 0);
    const parsedTurns = [];
    const turnRegex = /^\*\*([^*]+)\*\*(?:\s*\(([^)]+)\))?:\s*([\s\S]*)$/;

    for (const block of blocks) {
      const match = block.trim().match(turnRegex);
      if (match) {
        parsedTurns.push({
          speaker: match[1].trim(),
          role: match[2]?.trim() || '',
          speech: match[3]?.trim() || ''
        });
      }
    }

    if (parsedTurns.length >= 2) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {parsedTurns.map((turn, idx) => {
            const isCharA = idx % 2 === 0;
            return (
              <div
                key={idx}
                style={{
                  alignSelf: isCharA ? 'flex-start' : 'flex-end',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: isCharA ? 'row' : 'row-reverse',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: isCharA ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'linear-gradient(135deg, #ec4899, #be185d)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0,
                  boxShadow: isCharA ? '0 0 12px rgba(59, 130, 246, 0.4)' : '0 0 12px rgba(236, 72, 153, 0.4)'
                }}>
                  {turn.speaker.charAt(0).toUpperCase()}
                </div>
                <div style={{
                  background: isCharA ? 'rgba(30, 41, 59, 0.85)' : 'rgba(45, 26, 60, 0.85)',
                  border: isCharA ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(236, 72, 153, 0.35)',
                  borderRadius: isCharA ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                  padding: '14px 18px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: isCharA ? '#93c5fd' : '#f9a8d4' }}>
                      {turn.speaker}
                    </span>
                    {turn.role && (
                      <span style={{
                        fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.08)', color: '#94a3b8'
                      }}>
                        {turn.role}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.6 }}>
                    <EscribaMarkdownRenderer content={turn.speech} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.6 }}>
        <EscribaMarkdownRenderer content={dialogueText} />
      </div>
    );
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
            Simulación dialéctica entre personajes y deliberación multi-modelo contrapuesta de IA.
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
        <div style={{ display: 'grid', gridTemplateColumns: charDebateResult ? '360px 1fr' : '1fr', gap: '20px' }}>
          <div style={{ background: 'var(--surface-container, #0f172a)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary, #fff)', fontSize: '15px' }}>1. Selecciona Personajes</h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                Cada personaje actuará según su arquetipo, facción y protocolos narrativos.
              </p>
            </div>

            {characters.length === 0 ? (
              <div style={{ padding: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                No se encontraron personajes en el proyecto activo.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
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
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{attrs.archetype || attrs.faction || 'Personaje'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <h3 style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '15px' }}>2. Situación de la Escena o Dilema</h3>
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
            <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#a5b4fc' }}>
                    Diálogo de Escena: {charDebateResult.characters?.filter(Boolean).join(' vs ')}
                  </span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Dilema: &ldquo;{charDebateResult.dilemma || scenePrompt}&rdquo;
                  </p>
                </div>
                <button onClick={() => setCharDebateResult(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>X</button>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px' }}>
                {renderCharacterDialogue(charDebateResult.dialogue || charDebateResult.debate_transcript)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODEL DEBATE */}
      {activeTab === 'model_debate' && (
        <div style={{ display: 'grid', gridTemplateColumns: debateResult ? '360px 1fr' : '1fr', gap: '20px' }}>
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
              {loadingModel ? 'Sometiendo a Deliberación Multi-Modelo...' : 'Iniciar Debate Narrativo'}
            </button>
          </div>

          {debateResult && (
            <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#a5b4fc' }}>Dictamen del Ensamble Narrativo</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Deliberación dialéctica contrapuesta con síntesis y recomendación de redacción
                  </p>
                </div>
                <button onClick={() => setDebateResult(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>X</button>
              </div>

              {debateResult.perspectives && debateResult.perspectives.length >= 2 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Two perspective columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Perspective Alpha */}
                    <div style={{
                      background: 'rgba(30, 58, 138, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '10px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Perspectiva Alpha: {debateResult.perspectives[0].model_role || 'Modelo Alpha'}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#bfdbfe' }}>
                          Temp {debateResult.perspectives[0].temperature || 0.3}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                        <EscribaMarkdownRenderer content={debateResult.perspectives[0].argument} />
                      </div>
                    </div>

                    {/* Perspective Beta */}
                    <div style={{
                      background: 'rgba(112, 26, 117, 0.15)',
                      border: '1px solid rgba(217, 70, 239, 0.4)',
                      borderRadius: '10px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#f5d0fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          Perspectiva Beta: {debateResult.perspectives[1].model_role || 'Modelo Beta'}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(217, 70, 239, 0.2)', color: '#f0abfc' }}>
                          Temp {debateResult.perspectives[1].temperature || 0.8}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>
                        <EscribaMarkdownRenderer content={debateResult.perspectives[1].argument} />
                      </div>
                    </div>
                  </div>

                  {/* Synthesis / Verdict Card */}
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '10px',
                    padding: '18px'
                  }}>
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#fbbf24' }}>
                        Dictamen y Síntesis Literaria
                      </span>
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#f8fafc', lineHeight: 1.65 }}>
                      <EscribaMarkdownRenderer content={debateResult.synthesis || debateResult.response} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '8px' }}>
                  <EscribaMarkdownRenderer content={debateResult.response || debateResult.analysis || 'Debate completado.'} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


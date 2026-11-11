import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import EscribaEditorView from './EscribaEditorView';

const NexusScene3D = lazy(() => import('./NexusScene3D'));

const GENERAL_SUGGESTIONS = [
  'Explicar concepto',
  'Redactar o mejorar texto',
  'Analizar código',
  'Lluvia de ideas'
];

const SCRUM_SUGGESTIONS = [
  'Estado del sprint',
  'Arquitectura del sistema',
  'Comandos de control',
  'Agentes disponibles'
];

const ESCRIBA_SUGGESTIONS = [
  'Crear un Canva de escritura',
  'Personajes y lugares',
  'Simular efecto dominó',
  'Auditar inconsistencias',
  'Vacíos narrativos'
];

export default function ChatView({
  messages,
  onSendMessage,
  onNewChat,
  onNavigate,
  systemState,
  activeAgent,
  onToggleSidebar,
  onSelectChapter,
  onForkChat,
  initialShowScrumPanel = false,
  initialScrumTab = 'sprint_board'
}) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [canvaCreated, setCanvaCreated] = useState(false);
  const [canvaRequested, setCanvaRequested] = useState(false);
  const [showCanvasPanel, setShowCanvasPanel] = useState(false);
  const [showScrumPanel, setShowScrumPanel] = useState(initialShowScrumPanel);
  const [scrumTab, setScrumTab] = useState(initialScrumTab);
  const [scrumData, setScrumData] = useState({ backlog: '', sprint_board: '', daily: '' });
  const [loadingScrum, setLoadingScrum] = useState(false);
  const [isCanvasModeTagged, setIsCanvasModeTagged] = useState(false);

  // Resizable Canva & Scrum side-panel widths
  const [canvaWidth, setCanvaWidth] = useState(520);
  const [scrumWidth, setScrumWidth] = useState(520);
  const isResizingRef = useRef(false);
  const isResizingScrumRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(520);
  const startXScrumRef = useRef(0);
  const startWidthScrumRef = useRef(520);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const plusMenuRef = useRef(null);
  const escribaFileInputRef = useRef(null);
  const generalFileInputRef = useRef(null);

  const isScrumActive = Boolean(systemState?.scrum_active);
  const isEscribaActive = Boolean(systemState?.escriba_active);
  const hasProject = systemState?.project && systemState.project !== 'Sin proyecto';
  const hasActiveEscribaProject = Boolean(
    systemState?.active_project &&
    systemState.active_project.trim() !== '' &&
    systemState.active_project !== 'Sin proyecto' &&
    systemState.active_project !== 'Ninguno'
  );
  const isEscribaNoProject = isEscribaActive && !hasActiveEscribaProject;

  const displayAgentName = (isEscribaActive && !isScrumActive)
    ? 'ESCRIBA'
    : (!isScrumActive
      ? 'Nexus'
      : (!activeAgent || activeAgent === 'default')
        ? 'Jellyfish'
        : activeAgent);


  let currentSuggestions = GENERAL_SUGGESTIONS;
  if (isEscribaActive && !isScrumActive) {
    currentSuggestions = ESCRIBA_SUGGESTIONS;
  } else if (isScrumActive && !isEscribaActive) {
    currentSuggestions = SCRUM_SUGGESTIONS;
  } else if (isEscribaActive && isScrumActive) {
    currentSuggestions = [...ESCRIBA_SUGGESTIONS.slice(0, 3), ...SCRUM_SUGGESTIONS.slice(0, 2)];
  }

  let subtitleText = '¿En qué deseas trabajar hoy?';
  if (isEscribaActive && !isScrumActive) {
    subtitleText = '¿En qué deseas trabajar hoy con la arquitectura narrativa del relato?';
  } else if (isScrumActive && !isEscribaActive && hasProject) {
    subtitleText = `¿En qué deseas trabajar hoy con tu proyecto ${systemState.project}?`;
  } else if (isScrumActive && !isEscribaActive) {
    subtitleText = '¿En qué deseas trabajar hoy con la gestión ágil de tu proyecto?';
  } else if (isEscribaActive && isScrumActive && hasProject) {
    subtitleText = `¿En qué deseas trabajar hoy con tu proyecto ${systemState.project} y la arquitectura narrativa del relato?`;
  } else if (isEscribaActive && isScrumActive) {
    subtitleText = '¿En qué deseas trabajar hoy con tus proyectos y relatos?';
  }

  // Regla estricta: Si se está en ESCRIBA sin proyecto activo, redirigir de inmediato al Gestor de Proyectos
  useEffect(() => {
    if (isEscribaNoProject) {
      onNavigate?.('escriba_projects');
    }
  }, [isEscribaNoProject, onNavigate]);

  if (isEscribaNoProject) {
    return null;
  }

  const fetchScrumData = useCallback(async () => {
    try {
      setLoadingScrum(true);
      const res = await fetch('/api/scrum');
      if (res.ok) {
        const data = await res.json();
        setScrumData(data);
      }
    } catch (err) {
      console.error('Error al cargar datos del tablero SCRUM:', err);
    } finally {
      setLoadingScrum(false);
    }
  }, []);

  useEffect(() => {
    if (showScrumPanel) {
      fetchScrumData();
    }
  }, [showScrumPanel, fetchScrumData]);

  useEffect(() => {
    if (initialShowScrumPanel) {
      setShowScrumPanel(true);
    }
  }, [initialShowScrumPanel]);

  // El botón de Canva solo existe en la sesión de chat donde se creó el canva
  useEffect(() => {
    if (!isEscribaActive) {
      setCanvaCreated(false);
      setShowCanvasPanel(false);
      return;
    }
    if (!messages || messages.length === 0) {
      setCanvaCreated(false);
      setShowCanvasPanel(false);
      return;
    }

    const hasCanvaInCurrentChat = messages.some(m => {
      const c = typeof m.content === 'string' ? m.content : '';
      return (
        c.includes('[ESCRIBA Canva') ||
        c.includes('[Borrador Cargado]') ||
        c.includes('Contenido Registrado en Canva') ||
        c.includes('Capítulo Actualizado en Canva') ||
        (c.includes('en el Canva') && (c.includes('He redactado') || c.includes('He actualizado')))
      );
    });

    setCanvaCreated(hasCanvaInCurrentChat);
    if (!hasCanvaInCurrentChat) {
      setShowCanvasPanel(false);
    }
  }, [messages, isEscribaActive]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target)) {
        setShowPlusMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCanvaResizeStart = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = canvaWidth;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = startXRef.current - moveEvent.clientX; // dragging left increases Canva panel width
      const newWidth = Math.max(320, Math.min(900, startWidthRef.current + deltaX));
      setCanvaWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleScrumResizeStart = (e) => {
    e.preventDefault();
    isResizingScrumRef.current = true;
    startXScrumRef.current = e.clientX;
    startWidthScrumRef.current = scrumWidth;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingScrumRef.current) return;
      const deltaX = startXScrumRef.current - moveEvent.clientX;
      const newWidth = Math.max(320, Math.min(900, startWidthScrumRef.current + deltaX));
      setScrumWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingScrumRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isSubmitting) return;

    if (isEscribaNoProject) {
      alert("[AVISO] Para chatear en ESCRIBA, primero debes crear o seleccionar un proyecto activo en el Gestor de Proyectos.");
      onNavigate?.('escriba_projects');
      return;
    }

    const wasCanvasTagged = isCanvasModeTagged;
    setInput('');
    setIsSubmitting(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const lowerText = text.toLowerCase();
    const isCanvaPrompt = isEscribaActive && (wasCanvasTagged || [
      'crear canva', 'crea canva', 'crear un canva', 'crea un canva',
      'en canva', 'en el canva', 'escribe en canva', 'escribir en canva',
      'crear en canva', 'para el canva'
    ].some(kw => lowerText.includes(kw)));
    
    let fullPrompt = text;
    if (isEscribaActive && wasCanvasTagged) {
      fullPrompt = `[ESCRIBA Canva — Crear Contenido] ${text}`;
    }

    const sendResult = await onSendMessage(fullPrompt, { displayText: text });

    if (isCanvaPrompt && sendResult?.success !== false) {
      const hasEscribaProj = Boolean(
        systemState?.active_project &&
        systemState.active_project.trim() !== '' &&
        systemState.active_project !== 'Sin proyecto'
      );
      if (hasEscribaProj) {
        setCanvaCreated(true);
        setCanvaRequested(true);
        setShowCanvasPanel(true);
      } else {
        alert("[AVISO] Para crear contenido en el Canva de ESCRIBA, primero debes crear o seleccionar un proyecto activo en el Gestor de Proyectos.");
        onNavigate?.('escriba_projects');
      }
      setIsCanvasModeTagged(false);
    } else if (sendResult?.success === false) {
      setIsCanvasModeTagged(false);
    }
    setIsSubmitting(false);
  };

  const parseInlineFormatting = (str) => {
    if (!str) return '';
    const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={pIdx} style={{ color: '#cbd5e1' }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={pIdx} style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em' }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderFormattedMessageContent = (content, role) => {
    if (!content) return '';
    if (role === 'user') return content;

    const isCanvaAction = typeof content === 'string' && (
      content.includes('Contenido Registrado en Canva') ||
      content.includes('Capítulo Actualizado en Canva') ||
      (content.includes('en el Canva') && (content.includes('He redactado') || content.includes('He actualizado')))
    );

    if (isCanvaAction) {
      const titleMatch = content.match(/\*\*Capítulo:\*\*\s*([^\n]+)/) ||
                         content.match(/\*\*(?:el borrador|el capítulo)\s+([^*]+)\*\*/i) ||
                         content.match(/\*\*([^*]+)\*\*/);
      const titleText = titleMatch ? titleMatch[1].trim() : 'Borrador de Canva';

      const metricsMatch = content.match(/\*\*Métricas:\*\*\s*([^\n]+)/) ||
                            content.match(/\(([0-9]+\s*palabras[^\)]*)\)/i);
      const metricsText = metricsMatch ? metricsMatch[1].trim() : '';

      const quoteMatch = content.match(/>\s*\*?"?([^"*\n]+(?:\n>[^\n]+)*)"?\*?/);
      const quoteText = quoteMatch ? quoteMatch[1].replace(/>\s*/g, '').trim() : '';

      const isUpdate = content.includes('Actualizado');

      return (
        <div className="canva-chat-card" style={{
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '10px',
          padding: '12px 14px',
          margin: '4px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isUpdate ? 'CANVA • Capítulo Actualizado' : 'CANVA • Manuscrito Registrado'}
            </span>
            <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
              Sincronizado
            </span>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
              {titleText}
            </div>
            {metricsText && (
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {metricsText}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px', lineHeight: 1.4 }}>
              {isUpdate ? 'Las modificaciones solicitadas fueron aplicadas directamente en el Canva.' : 'El manuscrito fue registrado y sincronizado en el Canva.'}
            </div>
          </div>

          

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Registrado y sincronizado con el Canva de Escritura.
            </span>
            <button
              type="button"
              onClick={() => {
                setShowCanvasPanel(true);
                if (showScrumPanel) setShowScrumPanel(false);
              }}
              style={{
                padding: '3px 10px',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93c5fd',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {showCanvasPanel ? 'Canva Abierto' : 'Abrir en Canva'}
            </button>
          </div>
        </div>
      );
    }

    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      if (line.startsWith('### ')) {
        return <h4 key={lIdx} style={{ margin: '8px 0 4px 0', fontSize: '14px', color: '#60a5fa', fontWeight: 700 }}>{parseInlineFormatting(line.substring(4))}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={lIdx} style={{ margin: '10px 0 4px 0', fontSize: '15px', color: '#93c5fd', fontWeight: 700 }}>{parseInlineFormatting(line.substring(3))}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={lIdx} style={{ margin: '12px 0 6px 0', fontSize: '16px', color: '#ffffff', fontWeight: 700 }}>{parseInlineFormatting(line.substring(2))}</h2>;
      }
      if (line.startsWith('> ')) {
        return (
          <div key={lIdx} style={{ borderLeft: '3px solid #60a5fa', paddingLeft: '8px', margin: '4px 0', color: '#cbd5e1', fontStyle: 'italic' }}>
            {parseInlineFormatting(line.substring(2))}
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={lIdx} style={{ height: '6px' }} />;
      }
      return (
        <div key={lIdx} style={{ margin: '2px 0', lineHeight: 1.5 }}>
          {parseInlineFormatting(line)}
        </div>
      );
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEscribaFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/escriba/import', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setCanvaCreated(true);
        setCanvaRequested(true);
        localStorage.setItem('escriba_canva_created', 'true');
        onSendMessage(`[Borrador Cargado] El borrador '${data.chapter?.title || file.name}' (${data.wordCount || 0} palabras) ha sido importado correctamente a los capítulos de ESCRIBA.`);
        setShowCanvasPanel(true);
      } else {
        alert('Error al cargar el archivo de borrador.');
      }
    } catch (err) {
      console.error('Error subiendo borrador a ESCRIBA:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleRetryMessage = (msgIndex) => {
    const userMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
    if (userMsg && userMsg.content) {
      onSendMessage(userMsg.content);
    }
  };

  const handleForkChat = async (msgIndex) => {
    try {
      const res = await fetch('/api/chat/sessions/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ until_index: msgIndex })
      });
      if (res.ok) {
        onForkChat?.();
      }
    } catch (err) {
      console.error('Error al bifurcar chat:', err);
    }
  };

  const handleGeneralFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileContent = event.target?.result || '';
      const formattedPrompt = `[Archivo Adjunto: ${file.name}]\n\n${fileContent}`;
      const userDisplay = `Archivo adjuntado: ${file.name}`;
      await onSendMessage(formattedPrompt, { displayText: userDisplay });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectMenuOption = async (option) => {
    setShowPlusMenu(false);
    if (option === 'canva_mode_toggle' || option === 'canva_open') {
      let currentProj = systemState?.active_project || systemState?.project;
      if (!currentProj || currentProj === 'Sin proyecto' || currentProj.trim() === '') {
        try {
          const res = await fetch('/api/escriba/projects');
          if (res.ok) {
            const data = await res.json();
            const projs = data.projects || [];
            const active = projs.find(p => p.active) || projs[0];
            if (active) {
              await fetch(`/api/escriba/projects/switch?project_id=${active.id}`, { method: 'POST' });
            }
          }
        } catch (err) {
          console.error('Error auto-activando proyecto para canva:', err);
        }
      }

      // Activa/desactiva la etiqueta de Modo Canva para el prompt.
      // IMPORTANTE: NO se abre el panel lateral de Canva aquí.
      // El cuadro de Canva solo se abrirá automáticamente una vez que se genere la respuesta del contenido.
      setIsCanvasModeTagged(prev => {
        const nextState = !prev;
        if (nextState) {
          setTimeout(() => textareaRef.current?.focus(), 50);
        }
        return nextState;
      });
    } else if (option === 'canva_toggle_panel') {
      setShowCanvasPanel(prev => !prev);
      if (showScrumPanel) setShowScrumPanel(false);
    } else if (option === 'context_file') {
      generalFileInputRef.current?.click();
    } else if (option === 'escriba_upload') {
      escribaFileInputRef.current?.click();
    } else if (option === 'scrum_open') {
      setShowScrumPanel(true);
      if (showCanvasPanel) setShowCanvasPanel(false);
    } else if (option === 'help') {
      onSendMessage('/help');
    }
  };

  return (
    <div className={`chat-container ${((isEscribaActive && showCanvasPanel) || (isScrumActive && showScrumPanel)) ? 'split-canvas-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: 'transparent' }}>
      
      {/* Top Navbar con Controles del Tablero y Opciones Integradas */}
      <header className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', background: 'rgba(0,0,0,0.15)' }}>
        <div className="chat-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="agent-badge">
            <span className="agent-badge-name">{displayAgentName}</span>
          </div>
        </div>

        {/* Acciones Rápidas del Tablero e Interfaz */}
        <div className="chat-header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isScrumActive && (
            <button
              type="button"
              className={`pro-btn pro-btn-sm ${showScrumPanel ? 'pro-btn-primary' : 'pro-btn-secondary'}`}
              onClick={() => {
                setShowScrumPanel(!showScrumPanel);
                if (showCanvasPanel) setShowCanvasPanel(false);
              }}
              title="Abrir/Cerrar Tablero Jellyfish"
            >
              <span>Tablero Jellyfish</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: showScrumPanel ? '#34d399' : '#64748b' }} />
            </button>
          )}

          {/* Botón de Canva: Esquina superior derecha del chat */}
          {isEscribaActive && canvaCreated && (
            <button
              type="button"
              className={`pro-btn pro-btn-sm ${showCanvasPanel ? 'pro-btn-amber' : 'pro-btn-secondary'}`}
              onClick={() => {
                setShowCanvasPanel(prev => !prev);
                if (showScrumPanel) setShowScrumPanel(false);
              }}
              title="Abrir/Cerrar Canva de Escritura"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
              <span>Canva</span>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: showCanvasPanel ? '#fde047' : '#64748b' }} />
            </button>
          )}
        </div>
      </header>

      {/* Main Body (Single or Split Panel Gemini Mode) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* Chat Left Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
          
          {/* Messages Scroll Area */}
          <div className="messages-area" style={{ flex: 1, overflowY: 'auto' }}>
            {messages.length === 0 && !isSubmitting ? (
              <div className="empty-state" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', textAlign: 'center',
                padding: (showCanvasPanel || showScrumPanel) ? '12px 10px' : '24px 16px',
                overflowY: 'auto',
                position: 'relative'
              }}>
                {/* 3D Morphing Geometric Core */}
                <div style={{
                  width: (showCanvasPanel || showScrumPanel) ? '180px' : '240px',
                  height: (showCanvasPanel || showScrumPanel) ? '180px' : '240px',
                  position: 'relative',
                  marginBottom: '12px',
                  pointerEvents: 'none',
                  overflow: 'visible'
                }}>
                  <Suspense fallback={null}>
                    <NexusScene3D
                      compact={true}
                      engine={(isEscribaActive && !isScrumActive) ? 'escriba' : (isScrumActive ? 'jellyfish' : 'nexus')}
                    />
                  </Suspense>
                </div>

                <div className={`pro-badge ${isEscribaActive ? 'pro-badge-amber' : (isScrumActive ? 'pro-badge-cyan' : 'pro-badge-indigo')}`} style={{ marginBottom: '14px' }}>
                  <span className="pro-badge-dot" />
                  {isEscribaActive ? 'Escriba Narrative Engine' : (isScrumActive ? 'Jellyfish Swarm Intelligence' : 'Nexus OS Autonomous Core')}
                </div>

                <h1 className="empty-title" style={{
                  fontSize: (showCanvasPanel || showScrumPanel) ? '22px' : '30px',
                  fontWeight: 780,
                  fontFamily: 'var(--font-display, Outfit, sans-serif)',
                  letterSpacing: '-0.025em',
                  marginBottom: '8px',
                  background: isEscribaActive
                    ? 'linear-gradient(135deg, #ffffff 40%, #fb923c 100%)'
                    : (isScrumActive ? 'linear-gradient(135deg, #ffffff 40%, #38bdf8 100%)' : 'linear-gradient(135deg, #ffffff 40%, #a78bfa 100%)'),
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {displayAgentName}
                </h1>
                <p className="empty-subtitle" style={{
                  fontSize: (showCanvasPanel || showScrumPanel) ? '12px' : '13.5px',
                  color: '#8b95a5', fontWeight: 400,
                  marginBottom: (showCanvasPanel || showScrumPanel) ? '16px' : '28px',
                  maxWidth: '460px', lineHeight: 1.6
                }}>
                  {isEscribaActive ? 'Arquitectura narrativa, coherencia de universo y worldbuilding multimodal.' : (isScrumActive ? 'Gestión ágil multi-agente, sprints coordinados y control de desarrollo.' : '¿En qué puedo ayudarte hoy?')}
                </p>

                {/* Suggestions Grid */}
                <div className="suggestions-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', maxWidth: '520px' }}>
                  {currentSuggestions.map((text, i) => (
                      <button
                        key={i}
                        className="suggestion-chip"
                        onClick={() => {
                          if (text === 'Crear un Canva de escritura') {
                            setIsCanvasModeTagged(true);
                            setTimeout(() => textareaRef.current?.focus(), 50);
                          } else {
                            onSendMessage(text);
                          }
                        }}
                        style={{
                          padding: (showCanvasPanel || showScrumPanel) ? '6px 12px' : '8px 16px',
                          fontSize: (showCanvasPanel || showScrumPanel) ? '11px' : '12px',
                          borderRadius: '20px',
                          background: 'rgba(14, 17, 28, 0.6)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          color: '#cbd5e1',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          fontWeight: 500,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = isEscribaActive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)';
                          e.currentTarget.style.borderColor = isEscribaActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(14, 17, 28, 0.6)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                          e.currentTarget.style.color = '#cbd5e1';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message-wrapper ${msg.role === 'user' ? 'user-wrapper' : 'assistant-wrapper'}`}
                  >
                    <div className="message-avatar">
                      {msg.role === 'user' ? 'U' : displayAgentName.charAt(0).toUpperCase()}
                    </div>
                    <div className="message-content">
                      <div className="message-sender">
                        {msg.role === 'user' ? 'Tú' : displayAgentName}
                      </div>
                      <div className="message-body">
                        {renderFormattedMessageContent(msg.content, msg.role)}
                      </div>

                      {msg.role === 'assistant' && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleRetryMessage(index)}
                            style={{
                              padding: '3px 9px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.12)',
                              background: 'rgba(255,255,255,0.04)',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Volver a intentar y generar otra respuesta para este prompt"
                          >
                            <span>Reintentar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleForkChat(index)}
                            style={{
                              padding: '3px 9px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              border: '1px solid rgba(59, 130, 246, 0.35)',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#60a5fa',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Bifurcar este chat en una nueva sesión ligada al proyecto activo"
                          >
                            <span>Bifurcar Chat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isSubmitting && (
                  <div className="message-wrapper assistant-wrapper">
                    <div className="message-avatar">{displayAgentName.charAt(0).toUpperCase()}</div>
                    <div className="message-content" style={{ width: '100%' }}>
                      <div className="message-sender">{displayAgentName}</div>
                      <div className="nexus-working-card">
                        <div className="nexus-orb-container">
                          <div className="nexus-orb-core" />
                          <div className="nexus-orb-ring" />
                          <div className="nexus-orb-ring nexus-orb-ring-delay" />
                        </div>
                        <div className="nexus-working-content">
                          <div className="nexus-working-title">
                            <span>{isEscribaActive ? 'ESCRIBA Engine Procesando...' : `${displayAgentName} Generando Respuesta...`}</span>
                          </div>
                          <div className="nexus-working-subtitle">
                            {isEscribaActive 
                              ? 'Hilando manuscrito, verificando arco narrativo y contexto de personajes...' 
                              : 'Analizando contexto del proyecto y sintetizando respuesta...'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Box Area con Menú Desplegable '+' de Jellyfish */}
          <div className="input-area" style={{ padding: (showCanvasPanel || showScrumPanel) ? '10px 12px' : undefined }}>
            
            {/* Tag Chip indicando que la solicitud se creará en Canva */}
            {isEscribaActive && isCanvasModeTagged && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                marginBottom: '6px',
                background: 'rgba(99, 102, 241, 0.18)',
                border: '1px solid #818cf8',
                borderRadius: '20px',
                fontSize: '11px',
                color: '#ffffff',
                width: 'fit-content',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.2)'
              }}>
                <span style={{ fontWeight: 700, color: '#a5b4fc' }}>Modo Canva Activo</span>
                <span style={{ opacity: 0.85, fontSize: '10px', color: '#cbd5e1' }}>• Creará manuscrito en Canva</span>
                <button
                  type="button"
                  onClick={() => setIsCanvasModeTagged(false)}
                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '0 2px', fontWeight: 700 }}
                  title="Desactivar Modo Canva"
                >
                  X
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="input-box">
              <div className="plus-btn-wrapper" ref={plusMenuRef}>
                <input 
                  type="file"
                  ref={generalFileInputRef}
                  accept=".txt,.md,.markdown,.doc,.docx,.pdf,.json,.csv,.py,.js,.ts,.html,.css"
                  style={{ display: 'none' }}
                  onChange={handleGeneralFileUpload}
                />
                <input 
                  type="file"
                  ref={escribaFileInputRef}
                  accept=".txt,.md,.markdown,.doc,.docx,.json"
                  style={{ display: 'none' }}
                  onChange={handleEscribaFileUpload}
                />
                <button
                  type="button"
                  className={`plus-action-btn ${showPlusMenu ? 'active' : ''}`}
                  onClick={() => {
                    if (isEscribaNoProject) {
                      alert("[AVISO] Para interactuar en ESCRIBA, primero debes crear o seleccionar un proyecto en el Gestor de Proyectos.");
                      onNavigate?.('escriba_projects');
                      return;
                    }
                    setShowPlusMenu(!showPlusMenu);
                  }}
                  disabled={isEscribaNoProject}
                  style={isEscribaNoProject ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  title={isEscribaNoProject ? "Requiere un proyecto activo en ESCRIBA" : "Opciones adicionales"}
                >
                  +
                </button>

                {/* Menú Flotante Emergente */}
                {showPlusMenu && (
                  <div className="jellyfish-plus-menu">
                    <div className="menu-header-text">Opciones de Chat</div>

                    {isEscribaActive && (
                      <button 
                        type="button" 
                        className="menu-item"
                        onClick={() => handleSelectMenuOption('canva_mode_toggle')}
                      >
                        <span>{isCanvasModeTagged ? 'Desactivar Modo Canva' : 'Crear en Canva (Modo Canva)'}</span>
                      </button>
                    )}

                    {isEscribaActive && canvaCreated && (
                      <button 
                        type="button" 
                        className="menu-item"
                        onClick={() => handleSelectMenuOption('canva_toggle_panel')}
                      >
                        <span>{showCanvasPanel ? 'Ocultar panel Canva' : 'Abrir panel Canva'}</span>
                      </button>
                    )}

                    <button 
                      type="button" 
                      className="menu-item"
                      onClick={() => handleSelectMenuOption('context_file')}
                    >
                      <span>Cargar archivo de contexto</span>
                    </button>

                    {isEscribaActive && (
                      <button 
                        type="button" 
                        className="menu-item"
                        onClick={() => handleSelectMenuOption('escriba_upload')}
                      >
                        <span>Cargar borrador (.txt, .md)</span>
                      </button>
                    )}

                    {isScrumActive && (
                      <button 
                        type="button" 
                        className="menu-item"
                        onClick={() => handleSelectMenuOption('scrum_open')}
                      >
                        <span>Abrir tablero Jellyfish</span>
                      </button>
                    )}

                    <button 
                      type="button" 
                      className="menu-item"
                      onClick={() => handleSelectMenuOption('help')}
                    >
                      <span>Ver ayuda (/help)</span>
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={textareaRef}
                rows="1"
                className="chat-textarea"
                placeholder={(isEscribaActive && isCanvasModeTagged) ? "Describir contenido para el Canva..." : "Escribe tu mensaje..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting}
              />

              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim() || isSubmitting}
              >
                &gt;
              </button>
            </form>

            <div className="input-footer" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '10px', marginTop: '4px' }}>
              <span>
                Nexus OS v7.0 {(isScrumActive || isEscribaActive) ? `• RAG: ${systemState?.rag_status || 'Inactivo'} • Proyecto: ${systemState?.active_project_name || systemState?.active_project || systemState?.project || 'Ninguno'}` : '• Chat Conversacional Libre'}
              </span>
            </div>
          </div>
        </div>

        {/* Drag Handle between Chat & Tablero Panel */}
        {isScrumActive && showScrumPanel && (
          <div
            onMouseDown={handleScrumResizeStart}
            style={{
              width: '8px',
              cursor: 'col-resize',
              display: 'flex',
              justify: 'center',
              alignItems: 'center',
              userSelect: 'none',
              opacity: 0.6,
              transition: 'opacity 0.2s ease',
              zIndex: 10
            }}
            title="Arrastra para redimensionar el ancho del Tablero"
          >
            <div style={{ width: '3px', height: '40px', background: '#3b82f6', borderRadius: '2px' }} />
          </div>
        )}

        {/* Tablero Jellyfish Side Panel (Integrated into Chat Experience) */}
        {isScrumActive && showScrumPanel && (
          <div style={{
            width: `${scrumWidth}px`,
            minWidth: '320px',
            maxWidth: '900px',
            borderLeft: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-secondary, #18181b)',
            backdropFilter: 'blur(20px)'
          }}>
            {/* Panel Header */}
            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa' }}>Tablero Jellyfish Integrado</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>• {systemState?.project || 'Proyecto Activo'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={fetchScrumData} className="btn btn-outline btn-sm" style={{ fontSize: '11px', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }} title="Recargar Tablero">Recargar</button>
                <button onClick={() => setShowScrumPanel(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>X</button>
              </div>
            </div>

            {/* Quick Action Bar */}
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '6px', overflowX: 'auto' }}>
              <button onClick={() => onSendMessage('/auto')} className="btn btn-primary btn-sm" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap', background: '#2563eb', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                /auto Ejecutar Sprint
              </button>
              <button onClick={() => onSendMessage('@scrum_master Planifica el sprint actual y revisa el SPRINT_BOARD.md')} className="btn btn-outline btn-sm" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                @scrum_master
              </button>
              <button onClick={() => onSendMessage('@product_owner Revisa las Historias de Usuario en BACKLOG.md')} className="btn btn-outline btn-sm" style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
                @product_owner
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.1)' }}>
              <button onClick={() => setScrumTab('sprint_board')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: scrumTab === 'sprint_board' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: scrumTab === 'sprint_board' ? '#60a5fa' : '#94a3b8', borderBottom: scrumTab === 'sprint_board' ? '2px solid #60a5fa' : 'none', cursor: 'pointer' }}>
                Sprint Board
              </button>
              <button onClick={() => setScrumTab('backlog')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: scrumTab === 'backlog' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: scrumTab === 'backlog' ? '#60a5fa' : '#94a3b8', borderBottom: scrumTab === 'backlog' ? '2px solid #60a5fa' : 'none', cursor: 'pointer' }}>
                Backlog
              </button>
              <button onClick={() => setScrumTab('daily')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 600, border: 'none', background: scrumTab === 'daily' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: scrumTab === 'daily' ? '#60a5fa' : '#94a3b8', borderBottom: scrumTab === 'daily' ? '2px solid #60a5fa' : 'none', cursor: 'pointer' }}>
                Daily Log
              </button>
            </div>

            {/* Content View */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
              {loadingScrum ? (
                <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Cargando datos del tablero...</div>
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', lineHeight: 1.5, margin: 0 }}>
                  {scrumData[scrumTab] || `No se encontró información para ${scrumTab}.md.`}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Vertical Drag Handle between Chat & Canva Side Panel */}
        {isEscribaActive && showCanvasPanel && (
          <div
            onMouseDown={handleCanvaResizeStart}
            style={{
              width: '8px',
              cursor: 'col-resize',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              userSelect: 'none',
              opacity: 0.6,
              transition: 'opacity 0.2s ease',
              zIndex: 10
            }}
            title="Arrastra para redimensionar el ancho del panel Canva"
          >
            <div style={{ width: '3px', height: '40px', background: 'var(--accent-blue, #3b82f6)', borderRadius: '2px' }} />
          </div>
        )}

        {/* Gemini-Style Right Side Canva Panel (Theme Adaptive + Resizable) */}
        {isEscribaActive && showCanvasPanel && (
          <div style={{
            width: `${canvaWidth}px`,
            minWidth: '300px',
            maxWidth: '900px',
            borderLeft: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--surface-container, transparent)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ padding: '8px 14px', background: 'var(--bg-tertiary, rgba(255,255,255,0.03))', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>Canva de Escritura Integrado</span>
              <button
                onClick={() => setShowCanvasPanel(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', fontSize: '14px' }}
                title="Cerrar panel de Canva"
              >
                X
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <EscribaEditorView
                onNavigate={onNavigate}
                onSendMessage={onSendMessage}
                onSelectChapter={onSelectChapter}
                embedded={true}
                activeProject={systemState?.active_project}
                latestAiResponse={
                  messages.length > 0 && messages[messages.length - 1].role === 'assistant'
                    ? messages[messages.length - 1].content
                    : ''
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

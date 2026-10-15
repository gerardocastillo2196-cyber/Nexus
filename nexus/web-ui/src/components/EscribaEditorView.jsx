import React, { useState, useEffect, useRef } from 'react';

export default function EscribaEditorView({ onNavigate, onSendMessage, onSelectChapter, embedded = false, isEscribaActive = true, latestAiResponse = '' }) {
  const [chapters, setChapters] = useState([]);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [showChapterSidebar, setShowChapterSidebar] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Active chapter fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('Borrador');
  const [saveStatus, setSaveStatus] = useState('Guardado');

  // Text selection state for inline AI edits
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState({ start: 0, end: 0 });
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [selectionPrompt, setSelectionPrompt] = useState('');

  // General prompt bar state
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  // Resizable chapter column width
  const [sidebarWidth, setSidebarWidth] = useState(embedded ? 150 : 220);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [copiedUnified, setCopiedUnified] = useState(false);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(230);

  const lastProcessedAiRef = useRef('');
  const pendingSelectionRangeRef = useRef(null);

  const fetchChapters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escriba/chapters');
      if (res.ok) {
        const data = await res.json();
        let chaps = data.chapters || [];

        setChapters(chaps);
        if (chaps.length > 0) {
          const activeExists = chaps.find(c => c.id === activeChapterId);
          if (!activeChapterId || !activeExists) {
            selectChapter(chaps[chaps.length - 1] || chaps[0]);
          } else {
            const updatedActive = chaps.find(c => c.id === activeChapterId);
            if (updatedActive) {
              setContent(updatedActive.content || '');
              setTitle(updatedActive.title);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error cargando capítulos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, []);

  // Gemini Canvas Sync: Recargar capítulos cuando la IA responde en el Chat
  useEffect(() => {
    if (!latestAiResponse) return;
    if (latestAiResponse === lastProcessedAiRef.current) return;
    lastProcessedAiRef.current = latestAiResponse;

    fetchChapters();
    setSaveStatus('Actualizado en Canva por Nexus OS');
    setTimeout(() => setSaveStatus('Guardado'), 4000);
  }, [latestAiResponse]);

  const selectChapter = (chap, isExplicitClick = false) => {
    if (!chap) return;
    setActiveChapterId(chap.id);
    setTitle(chap.title || '');
    setContent(chap.content || '');
    setStatus(chap.status || 'Borrador');
    setSaveStatus('Guardado');
    setShowSelectionMenu(false);
    if (isExplicitClick) {
      onSelectChapter?.(chap);
    }
  };

  const handleSaveChapter = async () => {
    if (!title.trim() || !activeChapterId) return;
    setSaveStatus('Guardando...');

    try {
      const res = await fetch('/api/escriba/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeChapterId,
          title: title.trim(),
          content: content,
          status: status
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chapters)) {
          setChapters(data.chapters);
        }
        setSaveStatus('Guardado');
        setTimeout(() => setSaveStatus('Guardado'), 2000);
      } else {
        setSaveStatus('Error al guardar');
      }
    } catch (err) {
      setSaveStatus('Error al guardar');
    }
  };

  const handleNewChapter = async () => {
    const currentList = Array.isArray(chapters) ? chapters : [];
    const newTitle = `Capítulo ${currentList.length + 1}: Nuevo Capítulo`;
    try {
      const res = await fetch('/api/escriba/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: '',
          status: 'Borrador'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updatedList = Array.isArray(data.chapters) ? data.chapters : [];
        setChapters(updatedList);
        if (data.chapter) {
          selectChapter(data.chapter);
        } else if (updatedList.length > 0) {
          selectChapter(updatedList[updatedList.length - 1]);
        }
      }
    } catch (err) {
      console.error('Error creando capítulo:', err);
    }
  };

  const handleDeleteChapter = async (chapId) => {
    if (!window.confirm('¿Deseas eliminar este capítulo del manuscrito?')) return;
    try {
      const res = await fetch(`/api/escriba/chapters/${chapId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        const updatedList = Array.isArray(data.chapters) ? data.chapters : [];
        setChapters(updatedList);
        if (activeChapterId === chapId && updatedList.length > 0) {
          selectChapter(updatedList[0]);
        }
      }
    } catch (err) {
      console.error('Error eliminando capítulo:', err);
    }
  };

  const handleImportFile = async (e) => {
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
        if (data.chapters) setChapters(data.chapters);
        if (data.chapter) selectChapter(data.chapter);
      }
    } catch (err) {
      console.error('Error al importar borrador:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Drag Resizer for Chapter Sidebar Column Width
  const handleResizeStart = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(140, Math.min(450, startWidthRef.current + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Selection detection in Textarea
  const handleSelectText = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (start !== end && end > start) {
      const sel = content.substring(start, end);
      if (sel.trim().length > 0) {
        setSelectedText(sel);
        setSelectionRange({ start, end });
        setShowSelectionMenu(true);
        return;
      }
    }
  };

  const handleApplySelectionEdit = (actionType, customInstruction = '') => {
    let instruction = customInstruction;
    if (actionType === 'rewrite') instruction = 'Reescribir con mayor tensión y ritmo narrativo';
    if (actionType === 'expand') instruction = 'Expandir con detalles sensoriales e inmersivos';
    if (actionType === 'dialogue') instruction = 'Potenciar el subtexto y fricción en el diálogo';
    if (actionType === 'fix') instruction = 'Corregir estilo, gramática y coherencia';

    pendingSelectionRangeRef.current = selectionRange;

    const fullPrompt = `[ESCRIBA Canva — Edición de Selección] Modifica el siguiente fragmento del capítulo '${title}':\n\nFRAGMENTO SELECCIONADO:\n"${selectedText}"\n\nESPECIFICACIÓN:\n${instruction}`;
    
    if (onSendMessage) {
      onSendMessage(fullPrompt, { displayText: instruction });
      if (!embedded && onNavigate) onNavigate('chat');
    }
    setShowSelectionMenu(false);
  };

  const handleApplyGeneralPrompt = (e) => {
    e?.preventDefault();
    if (!generalPrompt.trim()) return;

    setIsProcessingAi(true);
    const fullPrompt = `[ESCRIBA Canva — Cambio General al Manuscrito] Aplica la siguiente modificación general al capítulo '${title}':\n\nINSTRUCCIÓN GENERAL:\n${generalPrompt.trim()}\n\nBORRADOR ACTUAL DEL CAPÍTULO:\n${content}`;
    
    if (onSendMessage) {
      onSendMessage(fullPrompt, { displayText: generalPrompt.trim() });
      if (!embedded && onNavigate) onNavigate('chat');
    }
    setGeneralPrompt('');
    setIsProcessingAi(false);
  };

  const totalUnifiedWords = (chapters || []).reduce((acc, c) => acc + (c.wordCount || (c.content ? c.content.trim().split(/\s+/).length : 0)), 0);
  const totalUnifiedReadingTime = Math.ceil(totalUnifiedWords / 200);
  const unifiedMarkdown = (chapters || []).map((chap, idx) => {
    return `## ${chap.title || `Capítulo ${idx + 1}`}\n\n${chap.content || '(Borrador sin contenido)'}`;
  }).join('\n\n---\n\n');

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className={`view-container escriba-editor-container ${embedded ? 'embedded-mode' : ''}`} style={{ padding: embedded ? '10px' : '20px', color: 'var(--text-primary, #ffffff)', height: '100%', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', background: 'transparent' }}>
      <input 
        type="file"
        ref={fileInputRef}
        accept=".txt,.md,.markdown,.doc,.docx,.json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {/* Header (Sólo en vista independiente completa) */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: '10px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
                Canva — Editor de Capítulos y Manuscritos
              </h1>
            </div>
            <p style={{ margin: '2px 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '12px' }}>
              Edición interactiva con IA por selección de texto y prompts de cambios generales.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowUnifiedModal(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                border: '1px solid #6366f1',
                color: '#a5b4fc',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title="Ver todos los capítulos y fragmentos unificados en un solo manuscrito continuo"
            >
              Ver Manuscrito Unificado ({(chapters || []).length})
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ padding: '6px 14px', borderRadius: '6px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
            >
              Cargar Borrador (.txt, .md)
            </button>
            <button
              onClick={handleSaveChapter}
              style={{ padding: '6px 14px', background: 'var(--accent-blue, #3b82f6)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
            >
              Guardar Capítulo
            </button>
          </div>
        </div>
      )}

      {/* Main Split Layout with Resizable Columns */}
      <div style={{ display: 'flex', gap: '0', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* Chapter Selector Column (Desplegable con botón) */}
        {showChapterSidebar && (
          <>
            <div style={{
              width: `${sidebarWidth}px`,
              minWidth: '130px',
              maxWidth: '450px',
              background: 'var(--surface-container, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: '6px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase' }}>Capítulos ({(chapters || []).length})</span>
                <button
                  onClick={handleNewChapter}
                  style={{ padding: '3px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Nuevo
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', overflowY: 'auto', flex: 1 }}>
                {(chapters || []).map((chap) => {
                  const isSelected = activeChapterId === chap.id;

                  return (
                    <div
                      key={chap.id}
                      onClick={() => selectChapter(chap, true)}
                      style={{
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                        background: isSelected ? 'var(--bg-hover, rgba(59, 130, 246, 0.2))' : 'var(--bg-tertiary, rgba(255,255,255,0.02))',
                        border: isSelected ? '1px solid var(--border-focus, #3b82f6)' : '1px solid transparent',
                        display: 'flex', flexDirection: 'column', gap: '3px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary, #ffffff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {chap.title}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteChapter(chap.id); }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', fontSize: '11px' }}
                        >
                          ✕
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                        <span>{chap.wordCount || 0} palabras</span>
                        <span style={{ fontWeight: 600 }}>{chap.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vertical Drag Handle between Chapter Sidebar & Editor */}
            <div
              onMouseDown={handleResizeStart}
              style={{
                width: '8px',
                cursor: 'col-resize',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
                opacity: 0.5,
                transition: 'opacity 0.2s ease',
                margin: '0 4px'
              }}
              title="Arrastra para redimensionar el ancho de la lista de capítulos"
            >
              <div style={{ width: '3px', height: '36px', background: 'var(--accent-blue, #3b82f6)', borderRadius: '2px' }} />
            </div>
          </>
        )}

        {/* Editor Main Canvas Area */}
        {activeChapterId ? (
          <div style={{
            flex: 1,
            background: 'var(--surface-container, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            borderRadius: '12px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            minWidth: 0
          }}>
            
            {/* Chapter Header Bar (Diseño adaptativo de 2 filas: nunca oculta botones al redimensionar) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', flexShrink: 0, paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Fila 1: Título del Capítulo (ocupa ancho completo responsivo) */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', minWidth: 0 }}>
                {isEscribaActive && (
                  <button
                    type="button"
                    onClick={() => setShowChapterSidebar(!showChapterSidebar)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: showChapterSidebar ? 'none' : '1px solid rgba(255,255,255,0.18)',
                      background: showChapterSidebar ? 'var(--accent-blue, #3b82f6)' : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                    title="Desplegar u ocultar lista de fragmentos y capítulos"
                  >
                    <span>Fragmentos ({(chapters || []).length})</span>
                  </button>
                )}

                <input
                  type="text"
                  value={title}
                  placeholder="Título del capítulo..."
                  onChange={(e) => { setTitle(e.target.value); setSaveStatus('Modificado'); }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Fila 2: Barra de Acciones siempre visible y navegable */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                width: '100%',
                flexWrap: 'wrap',
                overflowX: 'auto',
                paddingBottom: '2px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setSaveStatus('Modificado'); }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="Borrador" style={{ background: '#1e293b' }}>Borrador</option>
                    <option value="En Revisión" style={{ background: '#1e293b' }}>En Revisión</option>
                    <option value="Finalizado" style={{ background: '#1e293b' }}>Finalizado</option>
                  </select>

                  <button
                    onClick={handleSaveChapter}
                    style={{
                      padding: '5px 12px',
                      background: 'var(--accent-blue, #3b82f6)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    Guardar
                  </button>

                  <span style={{
                    fontSize: '11px',
                    color: saveStatus === 'Guardado' ? '#4ade80' : 'var(--text-muted, #94a3b8)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {saveStatus}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowUnifiedModal(true)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '4px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid #6366f1',
                      color: '#c7d2fe',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                    title="Ver todos los capítulos y fragmentos unificados en una sola obra continua"
                  >
                    Ver Manuscrito Unificado ({(chapters || []).length})
                  </button>

                  <button
                    onClick={() => {
                      const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
                      a.click();
                    }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--text-muted, #cbd5e1)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}
                    title="Exportar este capítulo como archivo Markdown"
                  >
                    Exportar (.md)
                  </button>
                </div>
              </div>
            </div>

            {/* Resizable Canva Textarea */}
            <textarea
              ref={textareaRef}
              rows={embedded ? 10 : 14}
              value={content}
              onSelect={handleSelectText}
              onKeyUp={handleSelectText}
              onMouseUp={handleSelectText}
              onChange={(e) => { setContent(e.target.value); setSaveStatus('Modificado'); }}
              placeholder="Escribe aquí la historia de este capítulo..."
              style={{
                width: '100%',
                flex: 1,
                padding: '14px',
                background: 'var(--bg-tertiary, rgba(0, 0, 0, 0.2))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                borderRadius: '8px',
                color: 'var(--text-primary, #ffffff)',
                fontSize: '13px',
                lineHeight: 1.6,
                resize: 'none',
                minHeight: '120px',
                outline: 'none'
              }}
            />

            {/* Metrics & Export Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }}>
              <div>
                <span>Palabras: <strong style={{ color: 'var(--text-primary, #fff)' }}>{wordCount}</strong></span>
                <span style={{ marginLeft: '12px' }}>Lectura: <strong style={{ color: 'var(--text-primary, #fff)' }}>~{readingTime} min</strong></span>
              </div>
              <button
                onClick={() => {
                  const blob = new Blob([`# ${title}

${content}`], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
                  a.click();
                }}
                style={{ padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
              >
                Exportar (.md)
              </button>
            </div>

            {/* HERRAMIENTAS Y HERRAMIENTAS SELECCIONADAS (SE REDIMENSIONAN DESDE ABAJO) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
              {/* TEXT SELECTION TOOLBAR AUTOMÁTICO (Despliega desde abajo) */}
              {showSelectionMenu && (
                <div style={{
                  background: 'var(--surface-elevated, rgba(15, 23, 42, 0.95))',
                  border: '1px solid var(--border-focus, #3b82f6)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-primary, #fff)', fontWeight: 700 }}>
                      Modificar fragmento en Canva ({selectedText.length} caracteres):
                    </span>
                    <button
                      onClick={() => setShowSelectionMenu(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      onClick={() => handleApplySelectionEdit('rewrite')}
                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Reescribir
                    </button>
                    <button
                      onClick={() => handleApplySelectionEdit('expand')}
                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Expandir detalles
                    </button>
                    <button
                      onClick={() => handleApplySelectionEdit('dialogue')}
                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Intensificar diálogo
                    </button>
                    <button
                      onClick={() => handleApplySelectionEdit('fix')}
                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Corregir estilo
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      placeholder="Escribe el prompt sobre lo que quieres cambiar en este texto..."
                      value={selectionPrompt}
                      onChange={(e) => setSelectionPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && selectionPrompt.trim()) {
                          handleApplySelectionEdit('custom', selectionPrompt.trim());
                          setSelectionPrompt('');
                        }
                      }}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', fontSize: '11px' }}
                    />
                    <button
                      onClick={() => {
                        if (selectionPrompt.trim()) {
                          handleApplySelectionEdit('custom', selectionPrompt.trim());
                          setSelectionPrompt('');
                        }
                      }}
                      style={{ padding: '4px 12px', background: 'var(--accent-blue, #3b82f6)', border: 'none', color: '#fff', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}

              {/* GENERAL PROMPT BAR FOR MANUSCRIPT TRANSFORMATIONS */}
              <form onSubmit={handleApplyGeneralPrompt} style={{ display: 'flex', gap: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', padding: '6px 8px', borderRadius: '8px', background: 'var(--bg-tertiary, rgba(255,255,255,0.02))', flexShrink: 0 }}>
                <input
                  type="text"
                  placeholder={embedded ? "Prompt para transformar capítulo..." : "Escribe un prompt para hacer un cambio general al capítulo (ej. 'haz la escena más melancólica')..."}
                  value={generalPrompt}
                  onChange={(e) => setGeneralPrompt(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '6px 10px', borderRadius: '6px', fontSize: '12px' }}
                />
                <button
                  type="submit"
                  disabled={!generalPrompt.trim() || isProcessingAi}
                  style={{ padding: '6px 12px', background: 'var(--accent-blue, #3b82f6)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {isProcessingAi ? 'Procesando...' : (embedded ? 'Transformar' : 'Transformar con IA')}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--surface-container, rgba(15, 23, 42, 0.6))', borderRadius: '12px', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
            Selecciona un capítulo o crea uno nuevo para comenzar a redactar.
          </div>
        )}
      </div>

      {/* Modal de Manuscrito Unificado Completo */}
      {showUnifiedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface-elevated, #0f172a)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '880px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
                  Manuscrito Unificado Completo
                </h2>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '12px', color: '#94a3b8' }}>
                  <span>{(chapters || []).length} fragmentos/capítulos</span>
                  <span>•</span>
                  <span>{totalUnifiedWords.toLocaleString()} palabras</span>
                  <span>•</span>
                  <span>~{totalUnifiedReadingTime} min de lectura</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(unifiedMarkdown);
                    setCopiedUnified(true);
                    setTimeout(() => setCopiedUnified(false), 2000);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: copiedUnified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    border: copiedUnified ? '1px solid #22c55e' : '1px solid rgba(255, 255, 255, 0.15)',
                    color: copiedUnified ? '#4ade80' : '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {copiedUnified ? '¡Copiado!' : 'Copiar Texto Completo'}
                </button>

                <button
                  onClick={() => {
                    const blob = new Blob([unifiedMarkdown], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Manuscrito_Completo_${new Date().toISOString().slice(0, 10)}.md`;
                    a.click();
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: 'var(--accent-blue, #3b82f6)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Exportar Obra (.md)
                </button>

                <button
                  onClick={() => setShowUnifiedModal(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Modal Body / Reader View */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 32px',
              lineHeight: 1.8,
              fontSize: '14px',
              color: '#e2e8f0'
            }}>
              {(chapters || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No hay capítulos registrados en este proyecto.
                </div>
              ) : (
                (chapters || []).map((chap, idx) => (
                  <div key={chap.id || idx} style={{ marginBottom: '32px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                      paddingBottom: '8px',
                      marginBottom: '16px'
                    }}>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#60a5fa' }}>
                        {chap.title}
                      </h3>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {chap.wordCount || (chap.content ? chap.content.trim().split(/\s+/).length : 0)} palabras • {chap.status}
                      </span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>
                      {chap.content || '(Borrador sin contenido redactado)'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

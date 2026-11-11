import React, { useState, useEffect, useRef } from 'react';

const AGENT_COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'yellow', 'cyan'];

const DEFAULT_AGENCIES = [
  {
    id: "escriba",
    name: "Agencia de Marco Teórico & Arquitectura Narrativa",
    agents: [
      { name: "arquitecto_narrativo", role: "Arquitecto Narrativo & Estratega de Worldbuilding" },
      { name: "historico", role: "Investigador Histórico & Contexto de Época" },
      { name: "filosofo", role: "Filosofía, Marco Teórico & Dilemas Éticos" },
      { name: "politico_geopolitico", role: "Geopolítica, Sistemas de Poder & Guerra" },
      { name: "teologo_mitologico", role: "Cosmovisiones, Teología & Mitología" },
      { name: "simulador_personajes", role: "Simulación de Personajes & Debates" },
      { name: "editor_literario", role: "Edición Estilística, Prosa & Tono" },
      { name: "oraculo_escritor", role: "Lluvia de Ideas & Giro de Trama" }
    ]
  },
  {
    id: "development",
    name: "Agencia Ágil de Desarrollo",
    agents: [
      { name: "product_owner", role: "Definición de Requerimientos y Backlog" },
      { name: "scrum_master", role: "Facilitador Ágil & Planificación" },
      { name: "architect_software", role: "Diseño de Arquitectura y Patrones" },
      { name: "developer", role: "Implementación de Código y Lógica" },
      { name: "qa_tester", role: "Verificación y Pruebas Unitarias" },
      { name: "code_reviewer", role: "Revisión de Calidad y Refactorización" }
    ]
  },
  {
    id: "research",
    name: "Agencia de Investigación y RAG",
    agents: [
      { name: "researcher", role: "Análisis de Datos e Investigación" },
      { name: "rag_specialist", role: "Indexación y Búsqueda Vectorial" }
    ]
  },
  {
    id: "management",
    name: "Agencia de Dirección y Coordinación",
    agents: [
      { name: "sentinel", role: "Supervisión y Control de Flujo" },
      { name: "coordinator", role: "Sincronización de Equipos" }
    ]
  }
];

export default function Sidebar({
  state,
  agenciesData,
  sessionsData,
  activeSessionId,
  activeAgent,
  activeView,
  onNavigate,
  onAgentSwitch,
  onNewChat,
  onSwitchSession,
  onRenameSession,
  onDeleteSession,
  onDeleteAllSessions,
  onSelectEscribaTool,
  isOpen,
  onClose
}) {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // TODOS LOS ACORDEONES CONTRAÍDOS POR DEFECTO EXCEPTO AGENCIAS INTERNAS
  const [sectionsOpen, setSectionsOpen] = useState({
    configuraciones: false,
    agencies: false,
    project: false,
    rag: false,
    settings: false,
    scrum: false,
    escriba: false,
  });
  const [expandedAgencies, setExpandedAgencies] = useState({});
  const [escribaToolsHeight, setEscribaToolsHeight] = useState(null);
  const [escribaProjects, setEscribaProjects] = useState([]);

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(300);
  const escribaListRef = useRef(null);

  const handleSaveRename = (sessionId) => {
    if (editingTitle.trim()) {
      onRenameSession?.(sessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  useEffect(() => {
    const fetchProjectsList = () => {
      if (state?.escriba_active) {
        fetch('/api/escriba/projects')
          .then(res => res.json())
          .then(data => {
            if (data.projects) setEscribaProjects(data.projects);
          })
          .catch(err => console.error(err));
      }
    };

    fetchProjectsList();
    const interval = setInterval(fetchProjectsList, 2000);
    return () => clearInterval(interval);
  }, [state?.escriba_active, activeView]);

  const activeEscribaProject = escribaProjects.find(p => p.active) || (
    state?.active_project && state.active_project !== 'Sin proyecto' && state.active_project !== 'Ninguno' && state.active_project.trim() !== ''
      ? { id: state.active_project, name: state.active_project_name || state.active_project }
      : null
  );
  const hasActiveEscribaProject = Boolean(
    activeEscribaProject &&
    state?.active_project &&
    state.active_project !== 'Sin proyecto' &&
    state.active_project !== 'Ninguno' &&
    state.active_project.trim() !== ''
  );

  const handleResizeStart = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = escribaToolsHeight || escribaListRef.current?.offsetHeight || 300;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = moveEvent.clientY - startYRef.current;
      const newHeight = Math.max(60, Math.min(600, startHeightRef.current + deltaY));
      setEscribaToolsHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    const rawAgencies = (agenciesData?.agencies && agenciesData.agencies.length > 0)
      ? agenciesData.agencies
      : DEFAULT_AGENCIES;
    const initial = {};
    rawAgencies.forEach(cat => {
      initial[cat.id] = true; // Desplegados por defecto al abrir la lista
    });
    setExpandedAgencies(prev => ({ ...initial, ...prev }));
  }, [agenciesData]);


  const toggleSection = (sectionKey) => {
    setSectionsOpen(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const toggleAgency = (agencyId) => {
    setExpandedAgencies(prev => ({
      ...prev,
      [agencyId]: !prev[agencyId]
    }));
  };

  const getColorClass = (index) => {
    return `agent-avatar-${AGENT_COLORS[index % AGENT_COLORS.length]}`;
  };

  // Filtrar y ordenar lista de sesiones de chat según el modo activo (ESCRIBA vs Jellyfish vs Nexus Neutral)
  const isEscribaMode = Boolean(state?.escriba_active);
  const isScrumMode = Boolean(state?.scrum_active) && !isEscribaMode;
  const activeMode = isEscribaMode ? 'escriba' : (isScrumMode ? 'jellyfish' : 'nexus');

  const brandTitleText = isEscribaMode ? 'ESCRIBA' : (isScrumMode ? 'JELLYFISH' : 'NEXUS');
  const brandSubtitleText = isEscribaMode
    ? 'Powered by Nexus Engine v7.0'
    : (isScrumMode ? 'Agencia Ágil & Desarrollo' : 'Nexus Engine v7.0 (Neutral)');

  const rawSessions = Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : [];

  const filteredSessions = rawSessions.filter(s => {
    let sessEng = s.engine;
    if (!sessEng) {
      if (s.is_escriba) sessEng = 'escriba';
      else if (s.is_jellyfish) sessEng = 'jellyfish';
      else sessEng = 'nexus';
    }

    if (activeMode === 'escriba') {
      if (!hasActiveEscribaProject) return false;
      return sessEng === 'escriba' && String(s.project_id) === String(activeEscribaProject.id);
    } else if (activeMode === 'jellyfish') {
      return sessEng === 'jellyfish' || sessEng === 'scrum';
    } else {
      // Nexus Neutral mode: show ONLY nexus/general chats without project_id
      return (sessEng === 'nexus' || sessEng === 'general') && (!s.is_escriba && !s.is_jellyfish && sessEng !== 'escriba' && sessEng !== 'jellyfish' && sessEng !== 'scrum' && !s.project_id);
    }
  });

  const handleNewChatClick = (e) => {
    if (e) e.stopPropagation();
    if (isEscribaMode && !hasActiveEscribaProject) {
      alert("[AVISO] Para crear un nuevo chat en ESCRIBA, primero debes crear o seleccionar un proyecto activo en el Gestor de Proyectos.");
      onNavigate('escriba_projects');
      return;
    }
    onNewChat();
    onNavigate('chat');
  };

  const sortedSessions = [...filteredSessions].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Brand Header: Ícono alterna la barra, Palabra NEXUS navega a Home */}
        <div className="sidebar-header">
          <div className="brand">
            <div 
              className="jellyfish-logo-icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed(!isCollapsed);
              }}
              style={{ cursor: 'pointer' }}
              title={isCollapsed ? "Desplegar barra lateral" : "Esconder barra lateral"}
            >
              {/* SVG Medusa Jellyfish minimalista */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C7 2 3 6 3 11c0 2 1 3.5 3 4.5V17a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1.5c2-1 3-2.5 3-4.5 0-5-4-9-9-9z"/>
                <path d="M7 18v3"/>
                <path d="M10 18v4"/>
                <path d="M14 18v4"/>
                <path d="M17 18v3"/>
              </svg>
            </div>
            <div 
              className="brand-text"
              onClick={() => onNavigate('home')}
              style={{ cursor: 'pointer' }}
              title="Ir a Inicio (Home)"
            >
              <span className="brand-title">{brandTitleText}</span>
              <span className="brand-subtitle">{brandSubtitleText}</span>
            </div>
          </div>
        </div>

        {isCollapsed ? (
          <div className="sidebar-collapsed-icons" style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', padding: '16px 0', boxSizing: 'border-box' }}>
            {/* GRUPO SUPERIOR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              {/* 1. Chat Nuevo */}
              {(!isEscribaMode || hasActiveEscribaProject) && (
                <button
                  className="collapsed-icon-btn"
                  onClick={handleNewChatClick}
                  title="Chat Nuevo (Desplegar barra lateral)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14m-7-7h14"/>
                  </svg>
                </button>
              )}

              {/* 2. Lista de Chats */}
              {(!isEscribaMode || hasActiveEscribaProject) && (
                <button
                  className="collapsed-icon-btn"
                  onClick={() => {
                    onNavigate('chat');
                    setIsCollapsed(false);
                  }}
                  title={`Chats (${sortedSessions.length}) — Desplegar barra lateral`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </button>
              )}

              {/* 3. Jellyfish (Si activo) */}
              {Boolean(state?.scrum_active) && (
                <button
                  className="collapsed-icon-btn"
                  onClick={() => {
                    onNavigate('scrum');
                    setIsCollapsed(false);
                  }}
                  title="Jellyfish Tablero Ágil (Desplegar barra lateral)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M8 7v10M12 7v6M16 7v4"/>
                  </svg>
                </button>
              )}

              {/* 4. ESCRIBA (Si activo) */}
              {Boolean(state?.escriba_active) && (
                <button
                  className="collapsed-icon-btn"
                  onClick={() => {
                    onNavigate('escriba_projects');
                    setIsCollapsed(false);
                  }}
                  title="ESCRIBA Proyectos (Desplegar barra lateral)"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* GRUPO INFERIOR (HASTA ABAJO) */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingBottom: '12px' }}>
              {/* 5. Tienda */}
              <button
                className="collapsed-icon-btn"
                onClick={() => {
                  onNavigate('store');
                  setIsCollapsed(false);
                }}
                title="Tienda de Herramientas (Desplegar barra lateral)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <path d="M3 6h18"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              </button>

              {/* 6. Configuración */}
              <button
                className="collapsed-icon-btn"
                onClick={() => {
                  onNavigate('settings');
                  setIsCollapsed(false);
                }}
                title="Configuraciones (Desplegar barra lateral)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="sidebar-content-wrapper">

              {/* SECCIÓN ESCRIBA REDIMENSIONABLE (UBICADA ARRIBA DE CHATS NUEVOS SI ESCRIBA ESTÁ ACTIVO) */}
              {state?.escriba_active && (
                <div className="sidebar-accordion-section escriba-main-section" style={{ marginBottom: '12px' }}>
                  <div 
                    ref={escribaListRef}
                    className="escriba-tools-list" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px', 
                      height: 'auto', 
                      maxHeight: escribaToolsHeight ? `${escribaToolsHeight}px` : 'none', 
                      overflowY: escribaToolsHeight ? 'auto' : 'visible' 
                    }}
                  >
                    <button 
                      className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_projects' ? 'selected' : ''}`}
                      onClick={() => onNavigate('escriba_projects')}
                    >
                      <span className="nav-item-text">Gestor de Proyectos</span>
                    </button>

                    {hasActiveEscribaProject && (
                      <>
                        <button 
                          className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_editor' ? 'selected' : ''}`}
                          onClick={() => onNavigate('escriba_editor')}
                        >
                          <span className="nav-item-text">Canva de Escritura</span>
                        </button>

                        <button 
                          className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_dashboard' ? 'selected' : ''}`}
                          onClick={() => onNavigate('escriba_dashboard')}
                        >
                          <span className="nav-item-text">Tablero de Trabajo</span>
                        </button>

                        <button 
                          className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_graph' ? 'selected' : ''}`}
                          onClick={() => onNavigate('escriba_graph')}
                        >
                          <span className="nav-item-text">Grafo Semántico & Relaciones</span>
                        </button>

                        <button 
                          className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_entities' ? 'selected' : ''}`}
                          onClick={() => onNavigate('escriba_entities')}
                        >
                          <span className="nav-item-text">Personajes, Lugares y Facciones</span>
                        </button>

                        <button 
                          className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_narrative' ? 'selected' : ''}`}
                          onClick={() => onNavigate('escriba_narrative')}
                        >
                          <span className="nav-item-text">Configuración e Historia</span>
                        </button>

                        <button 
                          className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_ensemble' ? 'selected' : ''}`}
                          onClick={() => onNavigate('escriba_ensemble')}
                        >
                          <span className="nav-item-text">Debate Multi-Modelo (Ensamble)</span>
                        </button>
                      </>
                    )}

                    <button 
                      className={`sidebar-nav-item escriba-tool-item ${activeView === 'escriba_settings' ? 'selected' : ''}`}
                      onClick={() => onNavigate('escriba_settings')}
                    >
                      <span className="nav-item-text">Protocolos y Lentes Narrativos</span>
                    </button>
                  </div>

                  {/* Drag Handle para redimensionar verticalmente la sección de ESCRIBA */}
                  <div 
                    className="escriba-resize-handle"
                    onMouseDown={handleResizeStart}
                    style={{
                      height: '8px',
                      cursor: 'ns-resize',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '4px',
                      marginTop: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      userSelect: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title="Arrastra para redimensionar la lista de herramientas de ESCRIBA"
                  >
                    <div style={{ width: '32px', height: '2px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '2px' }} />
                  </div>
                </div>
              )}
              
              {/* SECCIÓN DE CHATS Y NUEVO CHAT (OCULTA EN ESCRIBA SI NO HAY PROYECTO) */}
              {(!isEscribaMode || hasActiveEscribaProject) && (
                <>
                  {/* BOTÓN (ABAJO DE ESCRIBA): CHAT NUEVO */}
                  <div className="top-new-chat-container">
                    <button 
                      className="sidebar-action-btn primary-action new-chat-standalone-btn"
                      onClick={handleNewChatClick}
                      title="+ Chat Nuevo"
                    >
                      <span>+ Chat Nuevo</span>
                    </button>
                  </div>

                  {/* SECCIÓN (CENTRO): CHATS (ESTÁTICO, NO DESPLEGABLE, MAX 10 ITEMS + SCROLL) */}
                  <div className="middle-chats-container">
                    <div className="static-chats-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="chats-label">Chats</span>
                        <span className="chats-count-badge">{sortedSessions.length}</span>
                      </div>

                      {sortedSessions.length > 0 && (
                        confirmDeleteAll ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#fb7185', fontWeight: 600 }}>¿Vaciar?</span>
                            <button
                              onClick={() => {
                                setConfirmDeleteAll(false);
                                onDeleteAllSessions?.();
                              }}
                              style={{ background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                              title="Confirmar eliminación de todos los chats"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDeleteAll(false)}
                              style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', padding: '1px 3px' }}
                              title="Cancelar"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteAll(true)}
                            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', fontWeight: 550, transition: 'color 0.2s ease' }}
                            onMouseEnter={(e) => e.target.style.color = '#fb7185'}
                            onMouseLeave={(e) => e.target.style.color = '#64748b'}
                            title="Eliminar todos los chats"
                          >
                            Vaciar todos
                          </button>
                        )
                      )}
                    </div>

                    <div className="scrollable-chats-list">
                      {sortedSessions.map((session) => {
                        const isSessionActive = session.id === activeSessionId && activeView === 'chat';
                        const isEditing = editingSessionId === session.id;

                        return (
                          <div
                            key={session.id}
                            className={`sidebar-nav-item session-item ${isSessionActive ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justify: 'space-between',
                              padding: '6px 10px',
                              gap: '6px',
                              position: 'relative'
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRename(session.id);
                                    if (e.key === 'Escape') setEditingSessionId(null);
                                  }}
                                  autoFocus
                                  style={{
                                    flex: 1,
                                    background: 'rgba(8, 10, 18, 0.8)',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    borderRadius: '5px',
                                    color: '#f1f5f9',
                                    fontSize: '12px',
                                    padding: '3px 7px',
                                    outline: 'none'
                                  }}
                                />
                                <button
                                  onClick={() => handleSaveRename(session.id)}
                                  style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', fontSize: '11px', fontWeight: 600, padding: '2px' }}
                                  title="Guardar Nombre"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() => setEditingSessionId(null)}
                                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                                  title="Cancelar"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <>
                                <div
                                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', cursor: 'pointer' }}
                                  onClick={() => {
                                    onSwitchSession(session.id);
                                    onNavigate('chat');
                                  }}
                                >
                                  <span className="nav-item-text" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {session.title}
                                  </span>
                                  {isSessionActive && <span className="active-dot" title="Chat Activo" />}
                                </div>

                                {confirmDeleteId === session.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', color: '#fb7185', fontWeight: 600 }}>¿Borrar?</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(null);
                                        onDeleteSession?.(session.id);
                                      }}
                                      style={{ background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#fda4af', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                                      title="Confirmar eliminación"
                                    >
                                      Sí
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(null);
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', padding: '1px 3px' }}
                                      title="Cancelar"
                                    >
                                      X
                                    </button>
                                  </div>
                                ) : (
                                  <div className="session-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.75 }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSessionId(session.id);
                                        setEditingTitle(session.title);
                                        setConfirmDeleteId(null);
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px', transition: 'color 0.2s' }}
                                      onMouseEnter={(e) => e.target.style.color = '#94a3b8'}
                                      onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                      title="Renombrar Chat"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSessionId(null);
                                        setConfirmDeleteId(session.id);
                                      }}
                                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: '2px', transition: 'color 0.2s' }}
                                      onMouseEnter={(e) => e.target.style.color = '#fb7185'}
                                      onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                      title="Eliminar Chat"
                                    >
                                      X
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* BOTÓN DESPLEGABLE AGENCIA JELLYFISH & AGENTES (FUERA DE CONFIGURACIONES) */}
              {Boolean(state?.scrum_active) && (
                <div className="sidebar-accordion-section scrum-main-section" style={{ marginTop: '10px' }}>
                  <div 
                    className={`sidebar-accordion-header ${activeView === 'scrum' ? 'active-view-header' : ''}`}
                    onClick={() => toggleSection('scrum')}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px',
                      background: 'rgba(59, 130, 246, 0.15)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="section-title" style={{ color: '#60a5fa', fontWeight: 700 }}>Jellyfish — Agencia Ágil & Agentes</span>
                    </div>
                    <span className={`accordion-chevron ${sectionsOpen.scrum ? 'open' : ''}`}>▶</span>
                  </div>

                  {sectionsOpen.scrum && (
                    <div className="sidebar-accordion-body" style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {/* ACCIÓN PRINCIPAL DE LA AGENCIA JELLYFISH: CREAR PROYECTO */}
                      <button 
                        className={`sidebar-nav-item primary-action ${activeView === 'scrum' ? 'selected' : ''}`}
                        onClick={() => onNavigate('scrum', { tab: 'create_project' })}
                        style={{
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(30, 58, 138, 0.4) 100%)',
                          border: '1px solid rgba(59, 130, 246, 0.5)',
                          color: '#93c5fd',
                          fontWeight: 700
                        }}
                      >
                        <span className="nav-item-text">+ Crear Proyecto Jellyfish</span>
                      </button>

                      <button 
                        className={`sidebar-nav-item ${activeView === 'scrum' ? 'selected' : ''}`}
                        onClick={() => onNavigate('scrum', { tab: 'sprint_board' })}
                      >
                        <span className="nav-item-text">Tablero Jellyfish & Backlog</span>
                      </button>

                      {/* SUB-OPCIÓN 2: LISTA DE AGENCIAS Y AGENTES DE JELLYFISH */}
                      <div className="sidebar-subgroup" style={{ marginTop: '4px' }}>
                        <div 
                          className="subgroup-header"
                          onClick={() => toggleSection('agencies')}
                        >
                          <span className="subgroup-title">Lista de Agencias y Agentes</span>
                          <span className={`accordion-chevron ${sectionsOpen.agencies ? 'open' : ''}`}>▶</span>
                        </div>

                        {sectionsOpen.agencies && (
                          <div className="agencies-subaccordion-list">
                            {((agenciesData?.agencies && agenciesData.agencies.length > 0) ? agenciesData.agencies : DEFAULT_AGENCIES).map((agency) => {
                              const isExpanded = expandedAgencies[agency.id] ?? true;
                              const hasActiveAgent = agency.agents.some(a => a.name === activeAgent);

                              return (
                                <div key={agency.id} className={`agency-group ${hasActiveAgent ? 'has-active' : ''}`}>
                                  <div 
                                    className="agency-header"
                                    onClick={() => toggleAgency(agency.id)}
                                  >
                                    <div className="agency-title-group">
                                      <span className="agency-name">{agency.name}</span>
                                    </div>
                                    <div className="agency-meta">
                                      <span className="agent-count">{agency.agents.length}</span>
                                      <span className={`accordion-chevron ${isExpanded ? 'open' : ''}`}>▶</span>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="agency-agents-list">
                                      {agency.agents.map((agent, idx) => {
                                        const isActive = agent.name === activeAgent;

                                        return (
                                          <div
                                            key={agent.name}
                                            className={`agent-item ${isActive ? 'active' : ''}`}
                                            onClick={() => {
                                              onAgentSwitch(agent.name);
                                              onNavigate('chat');
                                            }}
                                          >
                                            <div className={`agent-avatar ${getColorClass(idx)}`}>
                                              {agent.name.charAt(0).toUpperCase()}
                                            </div>

                                            <div className="agent-details">
                                              <div className="agent-name-row">
                                                <span className="agent-handle">@{agent.name}</span>
                                                {isActive && <span className="active-dot" title="Agente Activo" />}
                                              </div>
                                              <span className="agent-role-text">{agent.role}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SUB-OPCIÓN 2: METODOLOGÍA JELLYFISH */}
                      <div className="sidebar-subgroup">
                        <button 
                          className={`sidebar-action-btn nav-screen-btn ${activeView === 'scrum' ? 'active-screen' : ''}`}
                          onClick={() => onNavigate('scrum')}
                        >
                          <span>Tablero & Metodología Jellyfish</span>
                          <span className="arrow-icon">{'>'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* BOTÓN 3 (HASTA ABAJO): TIENDA Y CONFIGURACIONES */}
              <div className="bottom-config-container" style={{ marginTop: 'auto', paddingTop: '12px' }}>
                {/* BOTÓN TIENDA */}
                <div className="sidebar-subgroup" style={{ marginBottom: '8px' }}>
                  <button 
                    className={`sidebar-action-btn nav-screen-btn store-nav-btn ${activeView === 'store' ? 'active-screen' : ''}`}
                    onClick={() => onNavigate('store')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: activeView === 'store' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: activeView === 'store' ? '1px solid var(--accent-color, #6366f1)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <span>Tienda</span>
                    <span className="arrow-icon">{'>'}</span>
                  </button>
                </div>

                <div className="sidebar-accordion-section config-main-section">
                  <div 
                    className={`sidebar-accordion-header config-header ${activeView === 'settings' ? 'active-view-header' : ''}`}
                    onClick={() => toggleSection('configuraciones')}
                  >
                    <div className="header-title-group">
                      <span className="section-title">Configuraciones</span>
                    </div>
                    <span className={`accordion-chevron ${sectionsOpen.configuraciones ? 'open' : ''}`}>▶</span>
                  </div>

                  {sectionsOpen.configuraciones && (
                    <div className="sidebar-accordion-body config-body">
                      {/* SUB-OPCIÓN 1: MODELO Y CONTEXTO */}
                      <div className="sidebar-subgroup">
                        <button 
                          className={`sidebar-action-btn nav-screen-btn ${activeView === 'settings' ? 'active-screen' : ''}`}
                          onClick={() => onNavigate('settings')}
                        >
                          <span>Modelo y Contexto</span>
                          <span className="arrow-icon">{'>'}</span>
                        </button>
                      </div>

                      {/* SUB-OPCIÓN 2 & 3: MOTOR RAG Y PROYECTOS (Solo si SCRUM o ESCRIBA están activos) */}
                      {(Boolean(state?.scrum_active) || Boolean(state?.escriba_active)) && (
                        <>
                          <div className="sidebar-subgroup">
                            <button 
                              className={`sidebar-action-btn nav-screen-btn ${activeView === 'rag' ? 'active-screen' : ''}`}
                              onClick={() => onNavigate('rag')}
                            >
                              <span>Motor RAG Vectorial</span>
                              <span className="arrow-icon">{'>'}</span>
                            </button>
                          </div>

                          <div className="sidebar-subgroup">
                            <button 
                              className={`sidebar-action-btn nav-screen-btn ${activeView === 'projects' ? 'active-screen' : ''}`}
                              onClick={() => onNavigate('projects')}
                            >
                              <span>Proyecto Workspace</span>
                              <span className="arrow-icon">{'>'}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="sidebar-footer">
              <div className="footer-model-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#64748b' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.5)' }} />
                <span style={{ fontWeight: 550, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {state?.model ? `${state.model} (${state?.provider || 'IA'})` : 'gemini-3.6-flash'}
                </span>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

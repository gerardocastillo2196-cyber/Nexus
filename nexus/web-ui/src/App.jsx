import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ProjectView from './components/ProjectView';
import RagView from './components/RagView';
import SettingsView from './components/SettingsView';
import ScrumView from './components/ScrumView';
import StoreView from './components/StoreView';
import EscribaDashboardView from './components/EscribaDashboardView';
import EscribaProjectsView from './components/EscribaProjectsView';
import EscribaEditorView from './components/EscribaEditorView';
import EscribaGraphView from './components/EscribaGraphView';
import EscribaEntitiesView from './components/EscribaEntitiesView';
import EscribaNarrativeView from './components/EscribaNarrativeView';
import EscribaEnsembleView from './components/EscribaEnsembleView';
import EscribaMarketplaceView from './components/EscribaMarketplaceView';
import EscribaSettingsView from './components/EscribaSettingsView';
import HomeView from './components/HomeView';

function App() {
  const [activeView, setActiveView] = useState('chat');
  const [systemState, setSystemState] = useState(null);
  const [agenciesData, setAgenciesData] = useState({ agencies: [] });
  const [sessionsData, setSessionsData] = useState({ sessions: [], active_session_id: 'default_session' });
  const [messages, setMessages] = useState([]);
  const [scrumPanelOpen, setScrumPanelOpen] = useState(false);
  const [scrumInitialTab, setScrumInitialTab] = useState('sprint_board');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (viewName, opts = {}) => {
    const isScrumActive = Boolean(systemState?.scrum_active);
    const isEscribaActive = Boolean(systemState?.escriba_active);
    const hasAnyToolActive = isScrumActive || isEscribaActive;

    if (viewName === 'scrum') {
      if (!isScrumActive) {
        setScrumPanelOpen(false);
        setActiveView('chat');
        return;
      }
      if (opts.tab) setScrumInitialTab(opts.tab);
      setScrumPanelOpen(true);
      setActiveView('chat');
      return;
    }
    if (viewName.startsWith('escriba_') && !isEscribaActive) {
      setScrumPanelOpen(false);
      setActiveView('chat');
      return;
    }
    if ((viewName === 'rag' || viewName === 'projects') && !hasAnyToolActive) {
      setScrumPanelOpen(false);
      setActiveView('chat');
      return;
    }
    setScrumPanelOpen(false);
    setActiveView(viewName);
  };

  // Cargar estado inicial del sistema
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setSystemState(data);
      }
    } catch (err) {
      console.error('Error al conectar con el backend de Jellyfish:', err);
    }
  }, []);

  // Cargar catálogo de agencias
  const fetchAgencies = useCallback(async () => {
    try {
      const res = await fetch('/api/agencies');
      if (res.ok) {
        const data = await res.json();
        setAgenciesData(data);
      }
    } catch (err) {
      console.error('Error al cargar agencias:', err);
    }
  }, []);

  // Cargar sesiones de chat
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessionsData(data);
      }
    } catch (err) {
      console.error('Error al cargar sesiones de chat:', err);
    }
  }, []);

  // Cargar historial de chat de la sesión activa
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.history || []);
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    }
  }, []);

  useEffect(() => {
    fetchState();
    fetchAgencies();
    fetchSessions();
    fetchHistory();

    const interval = setInterval(() => {
      fetchState();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchState, fetchAgencies, fetchSessions, fetchHistory]);

  // Recargar sesiones e historial al cambiar entre motor ESCRIBA, Jellyfish y Nexus (aislamiento de chats)
  useEffect(() => {
    fetchSessions();
    fetchHistory();
  }, [systemState?.escriba_active, systemState?.scrum_active, fetchSessions, fetchHistory]);

  // Tema global de Nexus OS: Liquid Glass o Predeterminado (configurable o derivado)
  const isLiquidGlass = systemState?.theme === 'liquid_glass' || systemState?.liquid_glass_enabled || (systemState?.theme === undefined && systemState?.escriba_active);

  useEffect(() => {
    if (isLiquidGlass) {
      document.documentElement.classList.add('theme-liquid-glass');
    } else {
      document.documentElement.classList.remove('theme-liquid-glass');
    }
  }, [isLiquidGlass]);

  // Cambiar agente activo
  const handleAgentSwitch = async (agentName) => {
    try {
      const res = await fetch(`/api/agent/${agentName}`, { method: 'POST' });
      if (res.ok) {
        await fetchState();
        await fetchAgencies();
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `✓ Agente cambiado a @${agentName}` }
        ]);
        setActiveView('chat');
      }
    } catch (err) {
      console.error('Error cambiando agente:', err);
    }
  };

  // Crear un chat nuevo
  const handleNewChat = async () => {
    try {
      if (systemState?.escriba_active) {
        const projRes = await fetch('/api/escriba/projects');
        if (projRes.ok) {
          const projData = await projRes.json();
          const activeProj = projData.projects?.find(p => p.active);
          if (!activeProj) {
            alert(" Para crear un nuevo chat en ESCRIBA, primero debes crear o seleccionar un proyecto activo.");
            setActiveView('escriba_projects');
            return;
          }
        }
      }

      const res = await fetch('/api/chat/new', { method: 'POST' });
      if (res.ok) {
        setMessages([]);
        await fetchSessions();
        await fetchState();
        setActiveView('chat');
      }
    } catch (err) {
      console.error('Error al iniciar nuevo chat:', err);
    }
  };

  // Cambiar de sesión de chat activa
  const handleSwitchSession = async (sessionId) => {
    try {
      const res = await fetch('/api/chat/sessions/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.history || []);
        await fetchSessions();
        await fetchState();
        setActiveView('chat');
      }
    } catch (err) {
      console.error('Error al cambiar de sesión de chat:', err);
    }
  };

  // Seleccionar fragmento/capítulo de ESCRIBA y cambiar su chat dedicado
  const handleSelectChapter = useCallback(async (chap) => {
    if (!chap || !chap.id) return;
    const chapSessionId = `escriba_chap_${chap.id}`;
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        const existing = (data.sessions || []).find(s => s.id === chapSessionId);
        if (existing) {
          await handleSwitchSession(chapSessionId);
        }
      }
    } catch (err) {
      console.error('Error al cambiar de sesión por fragmento:', err);
    }
  }, [handleSwitchSession]);

  // Enviar mensaje al backend
  const handleSendMessage = async (text, opts = {}) => {
    const userDisplayText = opts.displayText || text;
    // Actualización optimista inmediata en la UI con el texto limpio del usuario
    setMessages(prev => [...prev, { role: 'user', content: userDisplayText }]);

    try {
      const payload = {
        message: text,
        display_text: opts.displayText || undefined
      };
      if (opts.session_id) {
        payload.session_id = opts.session_id;
        payload.session_title = opts.session_title || 'Fragmento';
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.content === data.response) {
              return prev;
            }
            return [...prev, { role: 'assistant', content: data.response }];
          });
        }
        await fetchHistory();
        await fetchSessions();
        await fetchState();
      } else {
        const errData = await res.json();
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: ` Error: ${errData.detail || 'Ocurrió un problema en el servidor.'}` }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: ' Error de conexión con la API de Nexus OS.' }
      ]);
    }
  };

  // Seleccionar herramienta del motor nativo ESCRIBA
  const handleSelectEscribaTool = (toolName) => {
    let promptTemplate = '';
    if (toolName === 'Grafo & Entidades') {
      promptTemplate = '[ESCRIBA Engine — Grafo Semántico] Analiza el manuscrito/texto y extrae las Entidades principales (Personajes, Lugares, Facciones, Eventos) y sus Relaciones: ';
    } else if (toolName === 'Simulador Efecto Dominó') {
      promptTemplate = '[ESCRIBA Engine — Efecto Dominó] Realiza una simulación What-If de las consecuencias sociopolíticas y ruptura de alianzas tras el siguiente evento: ';
    } else if (toolName === 'Análisis Histórico & Geopolítica') {
      promptTemplate = '[ESCRIBA Engine — Análisis Histórico] Genera una radiografía del mundo evaluando Dinámicas de Poder, Geopolítica, Socioeconomía, Creencias y Cronología: ';
    } else if (toolName === 'Detector de Vacíos Narrativos') {
      promptTemplate = '[ESCRIBA Engine — Vacíos Narrativos] Revisa la topología del relato, identifica personajes aislados o inconexos y propone arcos puente: ';
    } else if (toolName === 'Debate Multi-Modelo (Ensamble)') {
      promptTemplate = '[ESCRIBA Engine — Ensamble Narrativo] Somete el dilema y fricción central del manuscrito a un debate cruzado entre modelos de IA: ';
    }
    if (promptTemplate) {
      handleSendMessage(promptTemplate);
    }
  };

  // Renombrar sesión de chat
  const handleRenameSession = async (sessionId, newTitle) => {
    try {
      const res = await fetch('/api/chat/sessions/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, title: newTitle })
      });
      if (res.ok) {
        await fetchSessions();
      }
    } catch (err) {
      console.error('Error al renombrar sesión de chat:', err);
    }
  };

  // Eliminar sesión de chat
  const handleDeleteSession = async (sessionId) => {
    try {
      const res = await fetch('/api/chat/sessions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchSessions();
        if (data.active_session_id) {
          handleSwitchSession(data.active_session_id);
        }
      }
    } catch (err) {
      console.error('Error al eliminar sesión de chat:', err);
    }
  };

  // Eliminar todas las sesiones de chat
  const handleDeleteAllSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions/delete_all', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessionsData(data);
        await fetchHistory();
      }
    } catch (err) {
      console.error('Error al eliminar todas las sesiones de chat:', err);
    }
  };

  const handleForkChat = useCallback(async () => {
    await fetchSessions();
    await fetchHistory();
    await fetchState();
  }, [fetchSessions, fetchHistory, fetchState]);

  return (
    <div className={`app-layout ${isLiquidGlass ? 'theme-liquid-glass' : ''}`}>
      <Sidebar
        state={systemState}
        agenciesData={agenciesData}
        sessionsData={sessionsData}
        activeSessionId={sessionsData?.active_session_id}
        activeAgent={systemState?.active_agent}
        activeView={activeView}
        onNavigate={handleNavigate}
        onAgentSwitch={handleAgentSwitch}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onDeleteAllSessions={handleDeleteAllSessions}
        onSelectEscribaTool={handleSelectEscribaTool}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-view-area">
        {activeView === 'chat' && (
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat}
            onNavigate={handleNavigate}
            onSelectChapter={handleSelectChapter}
            onForkChat={handleForkChat}
            systemState={systemState}
            activeAgent={systemState?.active_agent}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            initialShowScrumPanel={scrumPanelOpen}
            initialScrumTab={scrumInitialTab}
          />
        )}

        {activeView === 'projects' && (
          <ProjectView
            onNavigate={handleNavigate}
            onStateRefresh={() => { fetchState(); fetchHistory(); }}
          />
        )}

        {activeView === 'rag' && (
          <RagView
            onNavigate={handleNavigate}
            onStateRefresh={() => { fetchState(); fetchHistory(); }}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            onNavigate={handleNavigate}
            onStateRefresh={() => { fetchState(); }}
          />
        )}

        {activeView === 'scrum' && (
          <ScrumView
            onNavigate={handleNavigate}
            initialTab={scrumInitialTab}
          />
        )}

        {activeView === 'store' && (
          <StoreView
            systemState={systemState}
            onNavigate={(viewName) => setActiveView(viewName)}
            onStateRefresh={() => { fetchState(); }}
          />
        )}

        {activeView === 'escriba_dashboard' && (
          <EscribaDashboardView
            onNavigate={(viewName) => setActiveView(viewName)}
          />
        )}

        {activeView === 'escriba_projects' && (
          <EscribaProjectsView
            onNavigate={(viewName) => setActiveView(viewName)}
            onProjectChange={async () => {
              await fetchState();
              await fetchSessions();
              await fetchHistory();
            }}
          />
        )}

        {activeView === 'escriba_editor' && (
          <EscribaEditorView
            onNavigate={(viewName) => setActiveView(viewName)}
            onSendMessage={handleSendMessage}
            onSelectChapter={handleSelectChapter}
            isEscribaActive={Boolean(systemState?.escriba_active)}
          />
        )}

        {activeView === 'escriba_graph' && (
          <EscribaGraphView
            onNavigate={(viewName) => setActiveView(viewName)}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeView === 'escriba_entities' && (
          <EscribaEntitiesView
            onNavigate={(viewName) => setActiveView(viewName)}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeView === 'escriba_narrative' && (
          <EscribaNarrativeView
            onNavigate={(viewName) => setActiveView(viewName)}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeView === 'escriba_ensemble' && (
          <EscribaEnsembleView
            onNavigate={(viewName) => setActiveView(viewName)}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeView === 'home' && (
          <HomeView
            systemState={systemState}
            onNavigate={(viewName) => setActiveView(viewName)}
          />
        )}

        {activeView === 'escriba_settings' && (
          <EscribaSettingsView
            onNavigate={(viewName) => setActiveView(viewName)}
          />
        )}

        {activeView === 'escriba_marketplace' && (
          <EscribaMarketplaceView
            onNavigate={(viewName) => setActiveView(viewName)}
          />
        )}
      </main>
    </div>
  );
}

export default App;

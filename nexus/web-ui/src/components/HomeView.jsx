import React, { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   HOME VIEW v2.0 — PREMIUM LANDING WITH 3D & ANIMATIONS
   Renders a unique, engine-specific hero with 3D backgrounds,
   animated stats, interactive feature cards, and dynamic CTAs.
   ═══════════════════════════════════════════════════════════════════ */

let NexusScene3D = null;
try {
  NexusScene3D = React.lazy(() => import('./NexusScene3D'));
} catch (e) {
  NexusScene3D = null;
}

// --- ENGINE DATA -------------------------------------------------

const HOME_DATA = {
  nexus: {
    badge: 'Nexus OS Engine v7.0',
    badgeColor: '#818cf8',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
    badgeBorder: 'rgba(99, 102, 241, 0.25)',
    title: ['Asistente conversacional', 'inteligente y extensible'],
    subtitle: 'Núcleo conversacional libre con enrutamiento híbrido de modelos, historial persistente y capacidad de integración con agencias especializadas.',
    gradientTitle: 'linear-gradient(135deg, #ffffff 0%, #c7d2fe 35%, #818cf8 65%, #6366f1 100%)',
    glowColor: 'rgba(99, 102, 241, 0.3)',
    orbColors: [
      'rgba(99, 102, 241, 0.25)',
      'rgba(168, 85, 247, 0.2)',
      'rgba(56, 189, 248, 0.1)'
    ],
    ctaPrimary: { label: 'Iniciar Chat', view: 'chat' },
    ctaSecondary: { label: 'Tienda de Herramientas', view: 'store' },
    ctaPrimaryGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
    ctaPrimaryShadow: 'rgba(99, 102, 241, 0.4)',
    stats: [
      { value: 'Hybrid', label: 'Enrutamiento LLM', icon: '' },
      { value: 'Multi', label: 'Sesiones Paralelas', icon: '' },
      { value: 'RAG', label: 'Memoria Vectorial', icon: '' },
      { value: 'v7.0', label: 'Engine Version', icon: '' }
    ],
    featuresTitle: 'Capacidades del Núcleo',
    featuresSubtitle: 'Tu par programador, siempre disponible.',
    features: [
      {
        icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
        title: 'Chat Conversacional',
        desc: 'Sesiones dinámicas con historial persistente. Cada conversación mantiene su contexto completo.',
        color: '#818cf8', glow: 'rgba(129, 140, 248, 0.12)'
      },
      {
        icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
        title: 'Enrutamiento Híbrido',
        desc: 'Selecciona entre múltiples proveedores de IA (Gemini, OpenAI, Ollama local) y cambia de modelo en tiempo real.',
        color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.12)'
      },
      {
        icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
        title: 'Memoria y Contexto',
        desc: 'Historial persistente en base de datos SQLite. Todas tus conversaciones se guardan y son accesibles.',
        color: '#34d399', glow: 'rgba(52, 211, 153, 0.12)'
      },
      {
        icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
        title: 'Extensible via Tienda',
        desc: 'Activa agencias como ESCRIBA o Jellyfish desde la Tienda para ampliar las capacidades del sistema.',
        color: '#fb923c', glow: 'rgba(251, 146, 60, 0.12)'
      }
    ],
    ctaFooter: {
      title: 'Explora las herramientas disponibles',
      desc: 'Instala agencias, protocolos y metodologías desde la Tienda para personalizar tu flujo de trabajo.',
      buttonLabel: 'Abrir Tienda',
      buttonView: 'store'
    }
  },

  escriba: {
    badge: 'ESCRIBA Engine',
    badgeColor: '#fb923c',
    badgeBg: 'rgba(251, 146, 60, 0.1)',
    badgeBorder: 'rgba(251, 146, 60, 0.25)',
    title: ['Motor de arquitectura', 'narrativa y creación literaria'],
    subtitle: 'Herramienta integral para escritores: estructura capítulos, gestiona personajes, construye mundos y transforma borradores con asistencia de IA directamente en el Canva.',
    gradientTitle: 'linear-gradient(135deg, #ffffff 0%, #fde68a 30%, #fb923c 60%, #ea580c 100%)',
    glowColor: 'rgba(251, 146, 60, 0.3)',
    orbColors: [
      'rgba(251, 146, 60, 0.25)',
      'rgba(245, 158, 11, 0.2)',
      'rgba(234, 88, 12, 0.1)'
    ],
    ctaPrimary: null,
    ctaSecondary: null,
    ctaPrimaryGradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%)',
    ctaPrimaryShadow: 'rgba(249, 115, 22, 0.4)',
    stats: [
      { value: 'Canva', label: 'Editor en Vivo', icon: '' },
      { value: 'Grafos', label: 'Relaciones Semánticas', icon: '' },
      { value: '8', label: 'Agentes Narrativos', icon: '' },
      { value: 'Multi', label: 'Debate Ensamble', icon: '' }
    ],
    featuresTitle: 'Capacidades de la Plataforma',
    featuresSubtitle: 'Todo lo que necesitas para escribir, organizar y pulir tu obra.',
    features: [
      {
        icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
        title: 'Canva de Escritura',
        desc: 'Editor interactivo en vivo. Escribe, transforma y reorganiza capítulos, fragmentos y borradores con asistencia de IA.',
        color: '#fb923c', glow: 'rgba(251, 146, 60, 0.12)'
      },
      {
        icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
        title: 'Gestor de Capítulos',
        desc: 'Organiza tu manuscrito en capítulos y fragmentos. Control de versiones entre borrador y guardado oficial.',
        color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.12)'
      },
      {
        icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM20 8v6M23 11h-6',
        title: 'Personajes, Lugares y Facciones',
        desc: 'Base de datos estructurada de entidades narrativas: personajes con trasfondo, escenarios y grupos de poder.',
        color: '#34d399', glow: 'rgba(52, 211, 153, 0.12)'
      },
      {
        icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
        title: 'Grafo Semántico',
        desc: 'Visualiza las relaciones entre personajes, lugares, eventos y facciones en un grafo interactivo extraído del manuscrito.',
        color: '#818cf8', glow: 'rgba(129, 140, 248, 0.12)'
      },
      {
        icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
        title: 'Debate Multi-Modelo (Ensamble)',
        desc: 'Confronta múltiples modelos de IA para obtener perspectivas diversas sobre trama, estilo, coherencia y voz narrativa.',
        color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.12)'
      },
      {
        icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
        title: 'Configuración e Historia',
        desc: 'Define el marco histórico, épocas, ambientación y reglas del mundo. Establece el contexto base para todo el proyecto.',
        color: '#f472b6', glow: 'rgba(244, 114, 182, 0.12)'
      }
    ],
    ctaFooter: {
      title: 'Plataforma de Creación Literaria',
      desc: 'Gestiona tu narrativa, estructura capítulos y modela personajes con rigor arquitectónico desde la barra lateral.',
      buttonLabel: null,
      buttonView: null
    }
  },

  jellyfish: {
    badge: 'Jellyfish Engine',
    badgeColor: '#60a5fa',
    badgeBg: 'rgba(59, 130, 246, 0.1)',
    badgeBorder: 'rgba(59, 130, 246, 0.25)',
    title: ['Agencia ágil multi-agente', 'para desarrollo de software'],
    subtitle: 'Metodología Scrum automatizada con agentes especializados: Product Owner, Scrum Master, Arquitecto, Developer, QA y más, trabajando en equipo para ejecutar sprints completos.',
    gradientTitle: 'linear-gradient(135deg, #ffffff 0%, #bfdbfe 30%, #60a5fa 60%, #2563eb 100%)',
    glowColor: 'rgba(59, 130, 246, 0.3)',
    orbColors: [
      'rgba(59, 130, 246, 0.25)',
      'rgba(37, 99, 235, 0.2)',
      'rgba(96, 165, 250, 0.1)'
    ],
    ctaPrimary: { label: 'Crear Proyecto', view: 'scrum' },
    ctaSecondary: { label: 'Tablero y Backlog', view: 'scrum' },
    ctaPrimaryGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
    ctaPrimaryShadow: 'rgba(59, 130, 246, 0.4)',
    stats: [
      { value: '6+', label: 'Agentes Especializados', icon: '' },
      { value: 'Scrum', label: 'Metodología Ágil', icon: '' },
      { value: 'Auto', label: 'Sprints Automáticos', icon: '' },
      { value: 'CI/CD', label: 'Pipeline Integrado', icon: '' }
    ],
    featuresTitle: 'Capacidades de Jellyfish',
    featuresSubtitle: 'Desarrollo ágil orquestado por agentes de IA.',
    features: [
      {
        icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM20 8v6M23 11h-6',
        title: 'Agentes Especializados',
        desc: 'Product Owner, Scrum Master, Arquitecto, Developer, QA Tester y Code Reviewer. Cada uno con rol y competencias definidas.',
        color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.12)'
      },
      {
        icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 14l2 2 4-4',
        title: 'Tablero Scrum y Backlog',
        desc: 'Visualiza y gestiona historias de usuario, tareas del sprint, backlog priorizado y progreso en tiempo real.',
        color: '#34d399', glow: 'rgba(52, 211, 153, 0.12)'
      },
      {
        icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
        title: 'Planificación Automática',
        desc: 'El Product Owner genera requerimientos, el Scrum Master planifica sprints y distribuye tareas entre los agentes automáticamente.',
        color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.12)'
      },
      {
        icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
        title: 'Generación de Código',
        desc: 'El Developer y Arquitecto generan código siguiendo patrones definidos. El QA escribe pruebas y el Code Reviewer valida la calidad.',
        color: '#fb923c', glow: 'rgba(251, 146, 60, 0.12)'
      },
      {
        icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        title: 'Revisión y Calidad',
        desc: 'Pipeline de code review automatizado con detección de vulnerabilidades, refactorización y validación de estándares.',
        color: '#f472b6', glow: 'rgba(244, 114, 182, 0.12)'
      },
      {
        icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
        title: 'Ejecución de Sprints',
        desc: 'Corre sprints completos de forma autónoma: desde la definición de historias hasta la entrega de código funcional y testeado.',
        color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.12)'
      }
    ],
    ctaFooter: {
      title: 'Inicia tu primer Sprint',
      desc: 'Crea un proyecto, define tus requerimientos y deja que el equipo de agentes ejecute el desarrollo de forma autónoma.',
      buttonLabel: 'Crear Proyecto',
      buttonView: 'scrum'
    }
  }
};

// --- ANIMATED COUNTER COMPONENT ---
function AnimatedCounter({ value, duration = 1500 }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  return <span>{displayValue}</span>;
}

// --- MAIN COMPONENT ---
export default function HomeView({ systemState, onNavigate }) {
  const isEscribaActive = Boolean(systemState?.escriba_active);
  const isScrumActive = Boolean(systemState?.scrum_active) && !isEscribaActive;
  const activeEngine = isEscribaActive ? 'escriba' : (isScrumActive ? 'jellyfish' : 'nexus');
  const data = HOME_DATA[activeEngine];

  const hasActiveProject = Boolean(
    systemState?.active_project && 
    systemState.active_project.trim() !== '' && 
    systemState.active_project !== 'Sin proyecto'
  );

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleCtaClick = (view) => {
    if (onNavigate) onNavigate(view);
  };

  return (
    <div className="full-view-container home-view-container" style={{
      padding: '0',
      color: '#f8fafc',
      overflowY: 'auto',
      height: '100%',
      background: 'transparent',
      position: 'relative'
    }}>

      {/* ═══ 3D BACKGROUND SCENE ═══ */}
      {NexusScene3D && (
        <React.Suspense fallback={null}>
          <NexusScene3D engine={activeEngine} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.5,
            zIndex: 0
          }} />
        </React.Suspense>
      )}

      {/* ═══ HERO SECTION ═══ */}
      <div style={{
        position: 'relative',
        padding: '80px 56px 56px',
        overflow: 'hidden',
        minHeight: '420px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 1,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>

        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute', top: '-150px', left: '-100px',
          width: '600px', height: '600px',
          background: `radial-gradient(circle, ${data.orbColors[0]} 0%, transparent 60%)`,
          filter: 'blur(100px)',
          animation: 'float-orb 12s ease-in-out infinite',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-120px', right: '-80px',
          width: '500px', height: '500px',
          background: `radial-gradient(circle, ${data.orbColors[1]} 0%, transparent 60%)`,
          filter: 'blur(100px)',
          animation: 'float-orb 15s ease-in-out infinite reverse',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '60%',
          width: '400px', height: '400px',
          background: `radial-gradient(circle, ${data.orbColors[2]} 0%, transparent 60%)`,
          filter: 'blur(80px)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }} />

        {/* Dot grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '8px 20px',
            borderRadius: '9999px',
            background: data.badgeBg,
            border: `1px solid ${data.badgeBorder}`,
            marginBottom: '28px',
            fontSize: '11px', fontWeight: 700, color: data.badgeColor,
            letterSpacing: '2px', textTransform: 'uppercase',
            backdropFilter: 'blur(10px)',
            animation: isVisible ? 'fade-in-up 0.6s ease-out 0.2s both' : 'none'
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: data.badgeColor,
              boxShadow: `0 0 10px ${data.badgeColor}, 0 0 20px ${data.badgeColor}`,
              animation: 'pulse-dot 2s ease-in-out infinite'
            }} />
            {data.badge}
          </div>

          {/* Title */}
          <h1 style={{
            margin: '0 0 24px 0',
            fontSize: 'clamp(36px, 4.5vw, 56px)',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontWeight: 900,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            background: data.gradientTitle,
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 8s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s'
          }}>
            {data.title[0]}
            <br />{data.title[1]}
          </h1>

          {/* Subtitle */}
          <p style={{
            margin: '0 0 40px 0',
            fontSize: '17px',
            color: '#8892a6',
            lineHeight: 1.8,
            maxWidth: '580px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 0.8s ease 0.5s'
          }}>
            {data.subtitle}
          </p>

          {/* CTAs */}
          {(data.ctaPrimary || data.ctaSecondary) && (
            <div style={{
              display: 'flex', gap: '14px', flexWrap: 'wrap',
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
              transition: 'all 0.8s ease 0.7s'
            }}>
              {data.ctaPrimary && (
                <button
                  onClick={() => handleCtaClick(data.ctaPrimary.view)}
                  style={{
                    padding: '14px 32px',
                    background: data.ctaPrimaryGradient,
                    border: 'none',
                    borderRadius: '14px',
                    color: '#fff',
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '15px',
                    letterSpacing: '0.02em',
                    boxShadow: `0 0 0 1px ${data.ctaPrimaryShadow}, 0 8px 32px ${data.ctaPrimaryShadow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    e.target.style.transform = 'translateY(-3px) scale(1.02)';
                    e.target.style.boxShadow = `0 0 0 1px ${data.ctaPrimaryShadow}, 0 12px 40px ${data.ctaPrimaryShadow}, inset 0 1px 0 rgba(255,255,255,0.3)`;
                  }}
                  onMouseLeave={e => {
                    e.target.style.transform = 'translateY(0) scale(1)';
                    e.target.style.boxShadow = `0 0 0 1px ${data.ctaPrimaryShadow}, 0 8px 32px ${data.ctaPrimaryShadow}, inset 0 1px 0 rgba(255,255,255,0.2)`;
                  }}
                >
                  {data.ctaPrimary.label}
                </button>
              )}
            {data.ctaSecondary && (
              <button
                onClick={() => handleCtaClick(data.ctaSecondary.view)}
                style={{
                  padding: '14px 28px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  color: '#c4c7c5',
                  fontFamily: "'Outfit', 'Inter', sans-serif",
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '15px',
                  letterSpacing: '0.02em',
                  backdropFilter: 'blur(12px)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={e => {
                  e.target.style.background = 'rgba(255,255,255,0.08)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.target.style.color = '#fff';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.target.style.background = 'rgba(255,255,255,0.04)';
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.target.style.color = '#c4c7c5';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                {data.ctaSecondary.label}
              </button>
            )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1px',
        margin: '0 56px 56px',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        zIndex: 1,
        position: 'relative',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s ease 0.9s'
      }}>
        {data.stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '24px 16px',
            textAlign: 'center',
            borderRight: i < data.stats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            transition: 'background 0.3s ease',
            cursor: 'default',
            position: 'relative'
          }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `linear-gradient(180deg, ${data.glowColor.replace('0.3', '0.05')} 0%, transparent 100%)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ fontSize: '18px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{
              fontSize: '24px', fontWeight: 800, color: data.badgeColor,
              letterSpacing: '-0.02em', marginBottom: '4px',
              fontFamily: "'Outfit', 'Inter', sans-serif",
            }}>
              <AnimatedCounter value={s.value} />
            </div>
            <div style={{
              fontSize: '11px', color: '#4b5166', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ FEATURES GRID ═══ */}
      <div style={{ padding: '0 56px 56px', zIndex: 1, position: 'relative' }}>
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '12px', fontWeight: 700, color: '#3e4258',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            marginBottom: '10px'
          }}>
            {data.featuresTitle}
          </h2>
          <p style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '30px', fontWeight: 800, color: '#f0f1f5',
            letterSpacing: '-0.03em', lineHeight: 1.2, margin: 0
          }}>
            {data.featuresSubtitle}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '24px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {data.features.map((f, i) => (
            <div
              key={i}
              style={{
                padding: '36px 30px',
                background: 'rgba(10, 11, 18, 0.7)',
                backdropFilter: 'blur(20px)',
                cursor: 'default',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${f.glow} 0%, rgba(10, 11, 18, 0.8) 100%)`;
                e.currentTarget.style.transform = 'translateY(-2px)';
                const icon = e.currentTarget.querySelector('.feature-icon-box');
                if (icon) {
                  icon.style.transform = 'scale(1.1) rotate(5deg)';
                  icon.style.boxShadow = `0 0 20px ${f.glow}`;
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(10, 11, 18, 0.7)';
                e.currentTarget.style.transform = 'translateY(0)';
                const icon = e.currentTarget.querySelector('.feature-icon-box');
                if (icon) {
                  icon.style.transform = 'scale(1)';
                  icon.style.boxShadow = 'none';
                }
              }}
            >
              <div className="feature-icon-box" style={{
                width: '48px', height: '48px',
                borderRadius: '14px',
                background: `linear-gradient(135deg, ${f.glow} 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid ${f.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
                marginBottom: '22px',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3 style={{
                margin: '0 0 12px 0',
                fontFamily: "'Outfit', 'Inter', sans-serif",
                fontSize: '17px',
                fontWeight: 700,
                color: '#f0f1f5',
                letterSpacing: '-0.01em'
              }}>
                {f.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#6b7088',
                lineHeight: 1.7
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ CTA FOOTER ═══ */}
      <div style={{
        margin: '0 56px 56px',
        padding: '40px 44px',
        borderRadius: '24px',
        background: `linear-gradient(135deg, ${data.orbColors[0].replace(/0\.\d+/, '0.06')} 0%, ${data.orbColors[1].replace(/0\.\d+/, '0.04')} 50%, rgba(10,11,18,0.5) 100%)`,
        border: `1px solid ${data.badgeBorder}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px',
        backdropFilter: 'blur(20px)',
        zIndex: 1,
        position: 'relative'
      }}>
        <div>
          <h3 style={{
            margin: '0 0 8px 0',
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontSize: '22px', color: '#f0f1f5',
            fontWeight: 700, letterSpacing: '-0.02em'
          }}>
            {data.ctaFooter.title}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7088', lineHeight: 1.7 }}>
            {data.ctaFooter.desc}
          </p>
        </div>

        {data.ctaFooter.buttonLabel && (
          <button
            onClick={() => handleCtaClick(data.ctaFooter.buttonView)}
            style={{
              padding: '13px 28px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: data.badgeColor,
              fontFamily: "'Outfit', 'Inter', sans-serif",
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => {
              e.target.style.background = data.badgeBg;
              e.target.style.borderColor = data.badgeBorder;
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = `0 8px 24px ${data.ctaPrimaryShadow}`;
            }}
            onMouseLeave={e => {
              e.target.style.background = 'rgba(255,255,255,0.04)';
              e.target.style.borderColor = 'rgba(255,255,255,0.1)';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            {data.ctaFooter.buttonLabel} {'>'}
          </button>
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}
      </style>
    </div>
  );
}

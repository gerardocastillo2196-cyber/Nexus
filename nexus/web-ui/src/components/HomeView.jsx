import React from 'react';

/* ===================================================================
   HOME VIEW - Renderiza una pagina de inicio diferente para cada motor:
     1. NEXUS   (Neutral)  - Asistente conversacional libre
     2. ESCRIBA            - Motor de arquitectura narrativa
     3. JELLYFISH          - Agencia agil multi-agente
   =================================================================== */

// --- DATA POR MOTOR ------------------------------------------------

const HOME_DATA = {
  nexus: {
    badge: 'Nexus OS Engine v7.0',
    badgeColor: '#818cf8',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
    badgeBorder: 'rgba(99, 102, 241, 0.25)',
    title: ['Asistente conversacional', 'inteligente y extensible'],
    subtitle: 'Nucleo conversacional libre con enrutamiento hibrido de modelos, historial persistente y capacidad de integracion con agencias especializadas.',
    gradientTitle: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #818cf8 80%, #a78bfa 100%)',
    orbColors: [
      'rgba(99, 102, 241, 0.3)',
      'rgba(168, 85, 247, 0.25)',
      'rgba(56, 189, 248, 0.12)'
    ],
    ctaPrimary: { label: 'Iniciar Chat', view: 'chat' },
    ctaSecondary: { label: 'Tienda de Herramientas', view: 'store' },
    ctaPrimaryGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    ctaPrimaryShadow: 'rgba(99, 102, 241, 0.4)',
    stats: [
      { value: 'Hybrid', label: 'Enrutamiento LLM' },
      { value: 'Multi', label: 'Sesiones Paralelas' },
      { value: 'RAG', label: 'Memoria Vectorial' },
      { value: 'v7.0', label: 'Engine Version' }
    ],
    featuresTitle: 'Capacidades del Nucleo',
    featuresSubtitle: 'Tu par programador, siempre disponible.',
    features: [
      {
        icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
        title: 'Chat Conversacional',
        desc: 'Sesiones dinamicas con historial persistente. Cada conversacion mantiene su contexto completo.',
        color: '#818cf8', glow: 'rgba(129, 140, 248, 0.15)'
      },
      {
        icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
        title: 'Enrutamiento Hibrido',
        desc: 'Selecciona entre multiples proveedores de IA (Gemini, OpenAI, Ollama local) y cambia de modelo en tiempo real.',
        color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.15)'
      },
      {
        icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
        title: 'Memoria y Contexto',
        desc: 'Historial persistente en base de datos SQLite. Todas tus conversaciones se guardan y son accesibles.',
        color: '#34d399', glow: 'rgba(52, 211, 153, 0.15)'
      },
      {
        icon: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
        title: 'Extensible via Tienda',
        desc: 'Activa agencias como ESCRIBA o Jellyfish desde la Tienda para ampliar las capacidades del sistema.',
        color: '#fb923c', glow: 'rgba(251, 146, 60, 0.15)'
      }
    ],
    ctaFooter: {
      title: 'Explora las herramientas disponibles',
      desc: 'Instala agencias, protocolos y metodologias desde la Tienda para personalizar tu flujo de trabajo.',
      buttonLabel: 'Abrir Tienda',
      buttonView: 'store'
    }
  },

  escriba: {
    badge: 'ESCRIBA Engine',
    badgeColor: '#fb923c',
    badgeBg: 'rgba(251, 146, 60, 0.1)',
    badgeBorder: 'rgba(251, 146, 60, 0.25)',
    title: ['Motor de arquitectura', 'narrativa y creacion literaria'],
    subtitle: 'Herramienta integral para escritores: estructura capitulos, gestiona personajes, construye mundos y transforma borradores con asistencia de IA directamente en el Canva.',
    gradientTitle: 'linear-gradient(135deg, #ffffff 0%, #fde68a 35%, #fb923c 70%, #f97316 100%)',
    orbColors: [
      'rgba(251, 146, 60, 0.3)',
      'rgba(245, 158, 11, 0.25)',
      'rgba(234, 88, 12, 0.12)'
    ],
    ctaPrimary: { label: 'Gestor de Proyectos', view: 'escriba_projects' },
    ctaSecondary: { label: 'Tablero y Canva', view: 'escriba_dashboard' },
    ctaPrimaryGradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    ctaPrimaryShadow: 'rgba(249, 115, 22, 0.4)',
    stats: [
      { value: 'Canva', label: 'Editor en Vivo' },
      { value: 'Grafos', label: 'Relaciones Semanticas' },
      { value: '8', label: 'Agentes Narrativos' },
      { value: 'Multi', label: 'Debate Ensamble' }
    ],
    featuresTitle: 'Herramientas de ESCRIBA',
    featuresSubtitle: 'Todo lo que necesitas para escribir, organizar y pulir tu obra.',
    features: [
      {
        icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
        title: 'Canva de Escritura',
        desc: 'Editor interactivo en vivo. Escribe, transforma y reorganiza capitulos, fragmentos y borradores con asistencia de IA.',
        color: '#fb923c', glow: 'rgba(251, 146, 60, 0.15)'
      },
      {
        icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
        title: 'Gestor de Capitulos',
        desc: 'Organiza tu manuscrito en capitulos y fragmentos. Control de versiones entre borrador y guardado oficial.',
        color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.15)'
      },
      {
        icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM20 8v6M23 11h-6',
        title: 'Personajes, Lugares y Facciones',
        desc: 'Base de datos estructurada de entidades narrativas: personajes con trasfondo, escenarios y grupos de poder.',
        color: '#34d399', glow: 'rgba(52, 211, 153, 0.15)'
      },
      {
        icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
        title: 'Grafo Semantico',
        desc: 'Visualiza las relaciones entre personajes, lugares, eventos y facciones en un grafo interactivo extraido del manuscrito.',
        color: '#818cf8', glow: 'rgba(129, 140, 248, 0.15)'
      },
      {
        icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
        title: 'Debate Multi-Modelo (Ensamble)',
        desc: 'Confronta multiples modelos de IA para obtener perspectivas diversas sobre trama, estilo, coherencia y voz narrativa.',
        color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.15)'
      },
      {
        icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
        title: 'Configuracion e Historia',
        desc: 'Define el marco historico, epocas, ambientacion y reglas del mundo. Establece el contexto base para todo el proyecto.',
        color: '#f472b6', glow: 'rgba(244, 114, 182, 0.15)'
      }
    ],
    ctaFooter: {
      title: 'Comienza tu proyecto literario',
      desc: 'Crea un proyecto, define tus capitulos y deja que ESCRIBA te asista en cada etapa del proceso creativo.',
      buttonLabel: 'Crear Proyecto',
      buttonView: 'escriba_projects'
    }
  },

  jellyfish: {
    badge: 'Jellyfish Engine',
    badgeColor: '#60a5fa',
    badgeBg: 'rgba(59, 130, 246, 0.1)',
    badgeBorder: 'rgba(59, 130, 246, 0.25)',
    title: ['Agencia agil multi-agente', 'para desarrollo de software'],
    subtitle: 'Metodologia Scrum automatizada con agentes especializados: Product Owner, Scrum Master, Arquitecto, Developer, QA y mas, trabajando en equipo para ejecutar sprints completos.',
    gradientTitle: 'linear-gradient(135deg, #ffffff 0%, #bfdbfe 35%, #60a5fa 70%, #3b82f6 100%)',
    orbColors: [
      'rgba(59, 130, 246, 0.3)',
      'rgba(37, 99, 235, 0.25)',
      'rgba(96, 165, 250, 0.12)'
    ],
    ctaPrimary: { label: 'Crear Proyecto', view: 'scrum' },
    ctaSecondary: { label: 'Tablero y Backlog', view: 'scrum' },
    ctaPrimaryGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    ctaPrimaryShadow: 'rgba(59, 130, 246, 0.4)',
    stats: [
      { value: '6+', label: 'Agentes Especializados' },
      { value: 'Scrum', label: 'Metodologia Agil' },
      { value: 'Auto', label: 'Sprints Automaticos' },
      { value: 'CI/CD', label: 'Pipeline Integrado' }
    ],
    featuresTitle: 'Capacidades de Jellyfish',
    featuresSubtitle: 'Desarrollo agil orquestado por agentes de IA.',
    features: [
      {
        icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M12.5 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM20 8v6M23 11h-6',
        title: 'Agentes Especializados',
        desc: 'Product Owner, Scrum Master, Arquitecto de Software, Developer, QA Tester y Code Reviewer. Cada uno con rol y competencias definidas.',
        color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.15)'
      },
      {
        icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5h6M9 14l2 2 4-4',
        title: 'Tablero Scrum y Backlog',
        desc: 'Visualiza y gestiona historias de usuario, tareas del sprint, backlog priorizado y progreso en tiempo real.',
        color: '#34d399', glow: 'rgba(52, 211, 153, 0.15)'
      },
      {
        icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
        title: 'Planificacion Automatica',
        desc: 'El Product Owner genera requerimientos, el Scrum Master planifica sprints y distribuye tareas entre los agentes automaticamente.',
        color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.15)'
      },
      {
        icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
        title: 'Generacion de Codigo',
        desc: 'El Developer y Arquitecto generan codigo siguiendo patrones definidos. El QA escribe pruebas y el Code Reviewer valida la calidad.',
        color: '#fb923c', glow: 'rgba(251, 146, 60, 0.15)'
      },
      {
        icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
        title: 'Revision y Calidad',
        desc: 'Pipeline de code review automatizado con deteccion de vulnerabilidades, refactorizacion y validacion de estandares.',
        color: '#f472b6', glow: 'rgba(244, 114, 182, 0.15)'
      },
      {
        icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
        title: 'Ejecucion de Sprints',
        desc: 'Corre sprints completos de forma autonoma: desde la definicion de historias hasta la entrega de codigo funcional y testeado.',
        color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.15)'
      }
    ],
    ctaFooter: {
      title: 'Inicia tu primer Sprint',
      desc: 'Crea un proyecto, define tus requerimientos y deja que el equipo de agentes ejecute el desarrollo de forma autonoma.',
      buttonLabel: 'Crear Proyecto',
      buttonView: 'scrum'
    }
  }
};

// --- COMPONENTE PRINCIPAL -------------------------------------------

export default function HomeView({ systemState, onNavigate }) {
  // Determinar motor activo
  const isEscribaActive = Boolean(systemState?.escriba_active);
  const isScrumActive = Boolean(systemState?.scrum_active) && !isEscribaActive;
  const activeEngine = isEscribaActive ? 'escriba' : (isScrumActive ? 'jellyfish' : 'nexus');
  const data = HOME_DATA[activeEngine];

  const handleCtaClick = (view) => {
    onNavigate(view);
  };

  return (
    <div className="full-view-container home-view-container" style={{
      padding: '0',
      color: '#f8fafc',
      overflowY: 'auto',
      height: '100%',
      background: '#0a0a0f'
    }}>
      {/* HERO */}
      <div style={{
        position: 'relative',
        padding: '60px 48px 48px',
        overflow: 'hidden',
        minHeight: '380px',
        display: 'flex',
        alignItems: 'center'
      }}>
        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute', top: '-120px', left: '-80px',
          width: '500px', height: '500px',
          background: `radial-gradient(circle, ${data.orbColors[0]} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          animation: 'float-orb 12s ease-in-out infinite',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-60px',
          width: '400px', height: '400px',
          background: `radial-gradient(circle, ${data.orbColors[1]} 0%, transparent 70%)`,
          filter: 'blur(80px)',
          animation: 'float-orb 15s ease-in-out infinite reverse',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: '300px', height: '300px',
          background: `radial-gradient(circle, ${data.orbColors[2]} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none'
        }} />

        {/* Grid pattern overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            background: data.badgeBg,
            border: `1px solid ${data.badgeBorder}`,
            marginBottom: '24px',
            fontSize: '12px', fontWeight: 700, color: data.badgeColor,
            letterSpacing: '1.5px', textTransform: 'uppercase'
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: data.badgeColor,
              boxShadow: `0 0 8px ${data.badgeColor}`,
              animation: 'pulse-dot 2s ease-in-out infinite'
            }} />
            {data.badge}
          </div>

          {/* Title */}
          <h1 style={{
            margin: '0 0 20px 0',
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            background: data.gradientTitle,
            backgroundSize: '200% 200%',
            animation: 'gradient-shift 8s ease infinite',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {data.title[0]}
            <br />{data.title[1]}
          </h1>

          {/* Subtitle */}
          <p style={{
            margin: '0 0 36px 0',
            fontSize: '17px',
            color: '#64748b',
            lineHeight: 1.75,
            maxWidth: '600px'
          }}>
            {data.subtitle}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleCtaClick(data.ctaPrimary.view)}
              style={{
                padding: '13px 30px',
                background: data.ctaPrimaryGradient,
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '14px',
                letterSpacing: '0.02em',
                boxShadow: `0 0 0 1px ${data.ctaPrimaryShadow}, 0 4px 24px ${data.ctaPrimaryShadow}, inset 0 1px 0 rgba(255,255,255,0.15)`,
                transition: 'transform 0.2s ease, box-shadow 0.25s ease'
              }}
              onMouseEnter={e => { e.target.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; }}
            >
              {data.ctaPrimary.label}
            </button>
            <button
              onClick={() => handleCtaClick(data.ctaSecondary.view)}
              style={{
                padding: '13px 26px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                color: '#c4c7c5',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px',
                letterSpacing: '0.02em',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.color = '#fff'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.color = '#c4c7c5'; }}
            >
              {data.ctaSecondary.label}
            </button>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1px',
        margin: '0 48px 48px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        {data.stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            padding: '20px 16px',
            textAlign: 'center',
            borderRight: i < data.stats.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
          }}>
            <div style={{
              fontSize: '22px', fontWeight: 800, color: data.badgeColor,
              letterSpacing: '-0.02em', marginBottom: '4px'
            }}>{s.value}</div>
            <div style={{
              fontSize: '11px', color: '#64748b', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES GRID */}
      <div style={{ padding: '0 48px 48px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '13px', fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: '8px'
          }}>
            {data.featuresTitle}
          </h2>
          <p style={{
            fontSize: '28px', fontWeight: 800, color: '#f1f5f9',
            letterSpacing: '-0.02em', lineHeight: 1.2, margin: 0
          }}>
            {data.featuresSubtitle}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {data.features.map((f, i) => (
            <div
              key={i}
              style={{
                padding: '32px 28px',
                background: '#0a0a0f',
                cursor: 'default',
                transition: 'background 0.3s ease',
                position: 'relative'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${f.glow} 0%, #0a0a0f 100%)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#0a0a0f';
              }}
            >
              <div style={{
                width: '44px', height: '44px',
                borderRadius: '12px',
                background: f.glow,
                border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
                marginBottom: '20px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '16px',
                fontWeight: 700,
                color: '#f1f5f9',
                letterSpacing: '-0.01em'
              }}>
                {f.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#64748b',
                lineHeight: 1.65
              }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA FOOTER */}
      <div style={{
        margin: '0 48px 48px',
        padding: '36px 40px',
        borderRadius: '20px',
        background: `linear-gradient(135deg, ${data.orbColors[0].replace('0.3', '0.08')} 0%, ${data.orbColors[1].replace('0.25', '0.05')} 50%, ${data.orbColors[2].replace('0.12', '0.04')} 100%)`,
        border: `1px solid ${data.badgeBorder}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div>
          <h3 style={{
            margin: '0 0 6px 0', fontSize: '20px', color: '#f1f5f9',
            fontWeight: 700, letterSpacing: '-0.02em'
          }}>
            {data.ctaFooter.title}
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
            {data.ctaFooter.desc}
          </p>
        </div>

        <button
          onClick={() => handleCtaClick(data.ctaFooter.buttonView)}
          style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            color: data.badgeColor,
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.target.style.background = data.badgeBg; e.target.style.borderColor = data.badgeBorder; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.borderColor = 'rgba(255,255,255,0.12)'; }}
        >
          {data.ctaFooter.buttonLabel}
        </button>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}
      </style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import EscribaMarkdownRenderer from './EscribaMarkdownRenderer';

const TABS = [
  { id: 'contexts_timeline', label: 'Contextos & Cronología', icon: '', subtitle: 'Contextos Multidimensionales, Eras y Momentos Importantes' },
  { id: 'domino', label: 'Simulador Dominó', icon: '', subtitle: 'Simulación What-If de Ruptura de Alianzas' },
  { id: 'historical', label: 'Análisis Histórico', icon: '', subtitle: 'Radiografía Geopolítica y Socioeconómica' },
  { id: 'voids', label: 'Detector de Vacíos', icon: '', subtitle: 'Topología Narrativa y Arcos Puente' },
  { id: 'audit', label: 'Auditoría de Trama', icon: '', subtitle: 'Continuity Supervisor & Fixes' }
];

const CONTEXT_TYPES = [
  { id: 'politico', label: 'Político', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
  { id: 'religioso', label: 'Religioso / Espiritual', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)' },
  { id: 'social', label: 'Social / Comunitario', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)', border: 'rgba(74, 222, 128, 0.35)' },
  { id: 'ideologico', label: 'Ideológico / Filosófico', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.35)' },
  { id: 'economico', label: 'Económico / Recursos', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
  { id: 'militar', label: 'Militar / Bélico', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', border: 'rgba(248, 113, 113, 0.35)' },
  { id: 'cultural', label: 'Cultural / Costumbres', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
  { id: 'magico_tecnologico', label: 'Mágico / Tecnológico', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)' }
];

const NARRATIVE_OPTIONS_GUIDE = {
  contexts_timeline: {
    shortName: 'Contextos & Cronología',
    whatIs: 'Un entorno integral para parametrizar las dimensiones contextuales de tu universo (políticas, religiosas, sociales, ideológicas, económicas, militares, culturales) y organizar el flujo cronológico de la historia mediante períodos de tiempo determinados y líneas temporales con hitos cardinales.',
    purpose: 'Analizar la novela desde diferentes ángulos de observación para enriquecer los dilemas de los personajes, asegurar la coherencia del trasfondo y ubicar momentos cruciales en un mapa temporal claro sin anacronismos ni saltos de ritmo.',
    instructions: [
      'Paso 1: En la pestaña "Contextos Multidimensionales", utiliza "+ Nuevo Contexto" para documentar las leyes de poder, dogmas religiosos, doctrinas filosóficas o dinámicas de clase que rigen tu obra.',
      'Paso 2: En la pestaña "Períodos & Línea de Tiempo", establece las eras o períodos determinados de la novela con "+ Nuevo Período de Tiempo" (ej. "Era de la Paz Quebrada", "La Gran Ofensiva").',
      'Paso 3: Registra los momentos cruciales con "+ Nuevo Momento / Hito", asignándoles un período, fecha relativa, personajes involucrados y su repercusión en la trama.',
      'Paso 4: Consulta la Línea Temporal Visual interactiva para verificar la progresión dramática y ubicar exactamente cuándo ocurren los giros y clímax de tu manuscrito.'
    ],
    example: 'Caso de uso: Crear un contexto ideológico ("Doctrina de los Condenados") y ubicar en la línea temporal el momento clave "El Discurso en la Bastilla de Hierro" dentro del período "Meses Previos a la Rebelión".'
  },
  domino: {
    shortName: 'Simulador Dominó',
    whatIs: 'Modela y calcula matemáticamente las repercusiones en cascada cuando un personaje o facción clave es alterado (asesinado, encarcelado, desterrado o derrocado). Evalúa cómo se redistribuyen las lealtades del grafo relacional, qué alianzas se fragmentan y qué vacíos de poder se generan.',
    purpose: 'Prever las ramificaciones geopolíticas antes de escribir giros argumentales drásticos, garantizando que la caída de un personaje tenga consecuencias orgánicas y verosímiles en el mundo sin agujeros de guion.',
    instructions: [
      'Selecciona en la lista desplegable la "Entidad Afectada" (personaje o facción clave extraído del manuscrito).',
      'Redacta en el campo de texto el "Evento Hipotético Alterador" que detona la crisis (ej. "Es asesinado durante el banquete de coronación por un asesino con daga de plata").',
      'Haz clic en "Ejecutar Simulación Dominó" para poner a prueba la cohesión del relato.',
      'Analiza el informe desglosado: Alianzas Rotas, Quien toma el lugar (vacíos de poder) y Conflictos / Nuevas Guerras.'
    ],
    example: 'Caso de uso: Evalúa si tras la muerte del general del frente norte, sus tropas desertan o se subordinan a la facción rebelde.'
  },
  historical: {
    shortName: 'Análisis Histórico',
    whatIs: 'Una radiografía multidimensional que examina las seis capas estructurales del trasfondo del relato: Cronología, Dinámicas de Poder, Socioeconomía y Recursos, Sistema de Creencias, Paradigma Tecnológico y Vacíos Históricos.',
    purpose: 'Construir un worldbuilding blindado contra anacronismos y contradicciones, garantizando que las instituciones, economías y creencias del universo sean coherentes entre todos los capítulos.',
    instructions: [
      'Haz clic sobre cada una de las 6 dimensiones para incluirlas o excluirlas del análisis según las necesidades de tu capítulo.',
      'Haz clic en "Generar Radiografía Histórica" para procesar el manuscrito con el modelo de lenguaje.',
      'Examina el reporte erudito para detectar anacronismos, incoherencias institucionales o vacíos que debiliten la verosimilitud de la ambientación.'
    ],
    modulesGuide: [
      { name: '1. Cronología Inferida', desc: 'Reconstruye eras, fechas y secuencias temporales para evitar solapamientos o paradojas históricas.' },
      { name: '2. Dinámicas de Poder', desc: 'Examina monopolios de fuerza bélica, alianzas secretas y jerarquías de gobierno.' },
      { name: '3. Socioeconomía y Recursos', desc: 'Evalúa rutas de comercio, bienes vitales, tributos y disparidades de clases sociales.' },
      { name: '4. Sistema de Creencias', desc: 'Supervisa dogmas, religiones, supersticiones, tabúes morales y herejías.' },
      { name: '5. Paradigma Tecnológico', desc: 'Asegura consistencia en armas, metalurgia, comunicaciones o sistemas mágicos vigentes.' },
      { name: '6. Vacíos Históricos', desc: 'Detecta eras oscuras o sucesos pasados no documentados que ameritan ser profundizados.' }
    ],
    example: 'Caso de uso: Comprueba que el tipo de armamento y moneda empleado en el capítulo 4 coincida con la tecnología descrita en el capítulo 1.'
  },
  voids: {
    shortName: 'Detector de Vacíos',
    whatIs: 'Un analizador topológico que recorre la red relacional del proyecto para detectar personajes secundarios aislados, facciones pasivas o líneas argumentales que han quedado desconectadas del conflicto central.',
    purpose: 'Evitar cabos sueltos, rescatar personajes olvidados ("flores de fondo") y proponer situaciones de colisión dramática (arcos puente) que mantengan alta la tensión en cada capítulo.',
    instructions: [
      '(Opcional) Introduce fragmentos de capítulos o notas del arco argumental en el área de texto.',
      'Haz clic en "Detectar Vacíos Narrativos" para iniciar el escaneo de la topología relacional.',
      'Revisa los personajes periféricos detectados y las sugerencias de eventos puente para reincorporarlos al clímax o subtramas.'
    ],
    example: 'Caso de uso: Si un mentor desaparece tras el capítulo 2, el detector propondrá un evento de choque para justificar su ausencia o forzar su reaparición.'
  },
  audit: {
    shortName: 'Auditoría de Trama',
    whatIs: 'El supervisor de continuidad literaria de ESCRIBA. Lee minuciosamente el texto en busca de contradicciones lógicas, discordancias de objetos, viajes temporales/espaciales físicamente imposibles y armas de Chéjov sin disparar.',
    purpose: 'Garantizar una lectura limpia y profesional antes de enviar a imprenta, certámenes o revisión editorial, descubriendo fallos sutiles que el propio autor pasa por alto por cansancio visual.',
    instructions: [
      'Pega en el cuadro de texto el borrador del capítulo, escena o resumen de acontecimientos que deseas auditar.',
      'Presiona "Iniciar Auditoría de Trama" para someter el texto al filtro del Supervisor de Continuidad.',
      'Consulta la lista de incongruencias señaladas y aplica las soluciones narrativas recomendadas por el motor.'
    ],
    example: 'Caso de uso: Detectará si un personaje empuña una espada que perdió en el río en la escena anterior sin haberla recuperado.'
  }
};

export default function EscribaNarrativeView({ onNavigate, onSendMessage }) {
  const [activeTab, setActiveTab] = useState('contexts_timeline');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Guías desplegables de uso por cada pestaña
  const [openGuides, setOpenGuides] = useState({
    contexts_timeline: false,
    domino: false,
    historical: false,
    voids: false,
    audit: false
  });

  const toggleGuide = (tabId) => {
    setOpenGuides(prev => ({ ...prev, [tabId]: !prev[tabId] }));
  };

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
  const [auditScope, setAuditScope] = useState('full'); // 'full' | 'custom'

  // -------------------------------------------------------------
  // ESTADO DE CONTEXTOS MULTIDIMENSIONALES Y LÍNEAS TEMPORALES
  // -------------------------------------------------------------
  const [timelineSubView, setTimelineSubView] = useState('contexts'); // 'contexts' | 'timeline'
  const [selectedContextFilter, setSelectedContextFilter] = useState('all');
  const [timelineData, setTimelineData] = useState({
    contexts: [],
    periods: [],
    milestones: []
  });



  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodForm, setPeriodForm] = useState({
    name: '',
    timeRange: '',
    summary: '',
    color: '#38bdf8'
  });

  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    periodId: '',
    title: '',
    moment: '',
    description: '',
    impact: '',
    characters: ''
  });

  // Cargar grafo y timeline al inicio
  useEffect(() => {
    fetch('/api/escriba/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(err => console.error('Error cargando grafo:', err));

    fetch('/api/escriba/timeline')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setTimelineData({
            contexts: Array.isArray(data.contexts) ? data.contexts : [],
            periods: Array.isArray(data.periods) ? data.periods : [],
            milestones: Array.isArray(data.milestones) ? data.milestones : []
          });
        }
      })
      .catch(err => console.error('Error cargando línea temporal:', err));
  }, []);

  const saveTimelineToServer = async (newData) => {
    setTimelineData(newData);
    try {
      await fetch('/api/escriba/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (err) {
      console.error('Error guardando línea temporal:', err);
    }
  };

  // -------------------------------------------------------------
  // ESTADO Y MANEJADORES DE CONTEXTOS MULTIDIMENSIONALES
  // -------------------------------------------------------------
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [editingContext, setEditingContext] = useState(null);
  const [contextCreationMode, setContextCreationMode] = useState('fictional'); // 'fictional' | 'historical' | 'manual'
  const [contextAiPrompt, setContextAiPrompt] = useState('');
  const [contextAiLoading, setContextAiLoading] = useState(false);
  const [contextAiSuccess, setContextAiSuccess] = useState(false);
  const [contextForm, setContextForm] = useState({
    name: '',
    type: 'politico',
    description: '',
    narrativeAngle: '',
    keyEntities: ''
  });

  const handleOpenCreateContext = () => {
    setEditingContext(null);
    setContextCreationMode('fictional');
    setContextAiPrompt('');
    setContextAiLoading(false);
    setContextAiSuccess(false);
    setContextForm({
      name: 'Contexto Político',
      type: 'politico',
      description: '',
      narrativeAngle: '',
      keyEntities: ''
    });
    setContextModalOpen(true);
  };

  const handleChangeContextDimension = (newType) => {
    const prevTypeInfo = CONTEXT_TYPES.find(t => t.id === contextForm.type);
    const newTypeInfo = CONTEXT_TYPES.find(t => t.id === newType) || CONTEXT_TYPES[0];
    
    const isAutoName = !contextForm.name.trim() || 
      (prevTypeInfo && contextForm.name.trim() === `Contexto ${prevTypeInfo.label}`) ||
      CONTEXT_TYPES.some(ct => contextForm.name.trim() === `Contexto ${ct.label}`);
    
    setContextForm(prev => ({
      ...prev,
      type: newType,
      name: isAutoName ? `Contexto ${newTypeInfo.label}` : prev.name
    }));
  };

  const handleOpenEditContext = (ctx) => {
    setEditingContext(ctx);
    setContextCreationMode('manual');
    setContextAiPrompt('');
    setContextAiLoading(false);
    setContextAiSuccess(false);
    const typeInfo = CONTEXT_TYPES.find(t => t.id === (ctx.type || 'politico')) || CONTEXT_TYPES[0];
    setContextForm({
      name: ctx.name || `Contexto ${typeInfo.label}`,
      type: ctx.type || 'politico',
      description: ctx.description || '',
      narrativeAngle: ctx.narrativeAngle || '',
      keyEntities: ctx.keyEntities || ''
    });
    setContextModalOpen(true);
  };

  const handleExecuteAiGenerationForContext = async (overrideMode = null) => {
    const modeToUse = overrideMode || contextCreationMode;
    if (modeToUse === 'manual') return;
    setContextAiLoading(true);
    setContextAiSuccess(false);
    try {
      const res = await fetch('/api/escriba/contexts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dimension: contextForm.type || 'politico',
          idea: contextAiPrompt.trim() || contextForm.name.trim(),
          research_mode: modeToUse,
          is_historical: modeToUse === 'historical'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.context) {
          setContextForm({
            name: data.context.name || contextForm.name,
            type: data.context.type || contextForm.type || 'politico',
            description: data.context.description || '',
            narrativeAngle: data.context.narrativeAngle || '',
            keyEntities: data.context.keyEntities || ''
          });
          setContextAiSuccess(true);
        }
      }
    } catch (err) {
      console.error('Error generando contexto con IA:', err);
    } finally {
      setContextAiLoading(false);
    }
  };

  const handleSaveContext = () => {
    const typeInfo = CONTEXT_TYPES.find(t => t.id === contextForm.type) || CONTEXT_TYPES[0];
    const finalName = contextForm.name.trim() || `Contexto ${typeInfo.label}`;
    const payload = {
      ...contextForm,
      name: finalName
    };
    let updatedContexts;
    if (editingContext) {
      updatedContexts = timelineData.contexts.map(c =>
        c.id === editingContext.id ? { ...c, ...payload } : c
      );
    } else {
      const newCtx = {
        id: `ctx_${Date.now()}`,
        ...payload
      };
      updatedContexts = [...timelineData.contexts, newCtx];
    }
    saveTimelineToServer({ ...timelineData, contexts: updatedContexts });
    setContextModalOpen(false);
    setEditingContext(null);
  };

  const handleDeleteContext = (ctxId) => {
    if (window.confirm('¿Eliminar este contexto narrativo?')) {
      const updatedContexts = timelineData.contexts.filter(c => c.id !== ctxId);
      saveTimelineToServer({ ...timelineData, contexts: updatedContexts });
    }
  };

  // Manejadores para Períodos
  const handleOpenNewPeriod = () => {
    setEditingPeriod(null);
    setPeriodForm({
      name: '',
      timeRange: '',
      summary: '',
      color: '#38bdf8'
    });
    setPeriodModalOpen(true);
  };

  const handleOpenEditPeriod = (period) => {
    setEditingPeriod(period);
    setPeriodForm({
      name: period.name || '',
      timeRange: period.timeRange || '',
      summary: period.summary || '',
      color: period.color || '#38bdf8'
    });
    setPeriodModalOpen(true);
  };

  const handleSavePeriod = () => {
    if (!periodForm.name.trim()) return;
    let updatedPeriods;
    if (editingPeriod) {
      updatedPeriods = timelineData.periods.map(p =>
        p.id === editingPeriod.id ? { ...p, ...periodForm } : p
      );
    } else {
      const newPeriod = {
        id: `period_${Date.now()}`,
        ...periodForm
      };
      updatedPeriods = [...timelineData.periods, newPeriod];
    }
    saveTimelineToServer({ ...timelineData, periods: updatedPeriods });
    setPeriodModalOpen(false);
  };

  const handleDeletePeriod = (periodId) => {
    if (window.confirm('¿Eliminar este período de tiempo?')) {
      const updatedPeriods = timelineData.periods.filter(p => p.id !== periodId);
      saveTimelineToServer({ ...timelineData, periods: updatedPeriods });
    }
  };

  // Manejadores para Momentos/Hitos
  const handleOpenNewMilestone = (preselectedPeriodId = '') => {
    setEditingMilestone(null);
    setMilestoneForm({
      periodId: preselectedPeriodId || (timelineData.periods[0]?.id || ''),
      title: '',
      moment: '',
      description: '',
      impact: '',
      characters: ''
    });
    setMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (mile) => {
    setEditingMilestone(mile);
    setMilestoneForm({
      periodId: mile.periodId || '',
      title: mile.title || '',
      moment: mile.moment || '',
      description: mile.description || '',
      impact: mile.impact || '',
      characters: mile.characters || ''
    });
    setMilestoneModalOpen(true);
  };

  const handleSaveMilestone = () => {
    if (!milestoneForm.title.trim()) return;
    let updatedMilestones;
    if (editingMilestone) {
      updatedMilestones = timelineData.milestones.map(m =>
        m.id === editingMilestone.id ? { ...m, ...milestoneForm } : m
      );
    } else {
      const newMile = {
        id: `mile_${Date.now()}`,
        ...milestoneForm
      };
      updatedMilestones = [...timelineData.milestones, newMile];
    }
    saveTimelineToServer({ ...timelineData, milestones: updatedMilestones });
    setMilestoneModalOpen(false);
  };

  const handleDeleteMilestone = (mileId) => {
    if (window.confirm('¿Eliminar este momento clave de la línea temporal?')) {
      const updatedMilestones = timelineData.milestones.filter(m => m.id !== mileId);
      saveTimelineToServer({ ...timelineData, milestones: updatedMilestones });
    }
  };

  const handleRunTask = async (mode) => {
    setLoading(true);
    setResultData(null);

    try {
      // R-06: Relaciones directas del nodo objetivo para Efecto Dominó
      let contextLines = [];
      if (mode === 'simulate_domino' && dominoTarget) {
        const targetNode = graphData.nodes?.find(n => n.label === dominoTarget || n.id === dominoTarget);
        const targetId = targetNode?.id || dominoTarget;
        const connectedLinks = (graphData.links || []).filter(l =>
          l.source === targetId || l.target === targetId || l.source === dominoTarget || l.target === dominoTarget
        );
        contextLines = connectedLinks.map(l => {
          const otherId = (l.source === targetId || l.source === dominoTarget) ? l.target : l.source;
          const otherNode = graphData.nodes?.find(n => n.id === otherId);
          const otherLabel = otherNode?.label || otherId;
          const relLabel = l.label || l.relation || 'relacionado con';
          const desc = l.description ? ` (${l.description})` : '';
          return `${dominoTarget} tiene relación [${relLabel}] con ${otherLabel}${desc}`;
        });
      }

      // R-07: Facciones y personajes desconectados para Detección de Vacíos
      let factions = [];
      let isolatedChars = [];
      if (mode === 'suggest_voids' || mode === 'voids') {
        factions = (graphData.nodes || []).filter(n => n.type === 'faction' || n.type === 'faccion').map(n => n.label);
        const charNodes = (graphData.nodes || []).filter(n => n.type === 'character' || n.type === 'personaje');
        const connectedIds = new Set((graphData.links || []).flatMap(l => [l.source, l.target]));
        isolatedChars = charNodes.filter(c => !connectedIds.has(c.id)).map(c => c.label);
      }

      // R-09: Serializar contexto completo del grafo y cronología para Análisis Histórico
      let graphContext = '';
      if (mode === 'historical_analysis') {
        const entitiesSummary = (graphData.nodes || []).map(n => `- ${n.label} (${n.type}): ${n.description || ''}`).join('\n');
        const linksSummary = (graphData.links || []).map(l => {
          const s = graphData.nodes?.find(n => n.id === l.source)?.label || l.source;
          const t = graphData.nodes?.find(n => n.id === l.target)?.label || l.target;
          return `- ${s} -> [${l.label || l.relation || 'relación'}] -> ${t} ${l.description ? `(${l.description})` : ''}`;
        }).join('\n');
        const contextsSummary = (timelineData.contexts || []).map(c => `- Contexto ${c.type}: ${c.name} — ${c.description || ''}`).join('\n');
        const milestonesSummary = (timelineData.milestones || []).map(m => `- Hito: ${m.title} (${m.periodId || ''}) — ${m.description || ''}`).join('\n');

        graphContext = [
          entitiesSummary ? `ENTIDADES DEL PROYECTO:\n${entitiesSummary}` : '',
          linksSummary ? `RELACIONES CLAVE:\n${linksSummary}` : '',
          contextsSummary ? `CONTEXTOS HISTÓRICOS Y SOCIOPOLÍTICOS:\n${contextsSummary}` : '',
          milestonesSummary ? `LÍNEA TEMPORAL E HITOS:\n${milestonesSummary}` : '',
          customText ? `TEXTO ADICIONAL / BORRADOR:\n${customText}` : ''
        ].filter(Boolean).join('\n\n');
      }

      // R-08: Si en auditoría de trama está seleccionado el manuscrito completo, enviar texto vacío para que el backend lo compile automáticamente
      const taskText = (mode === 'plot_audit' && auditScope === 'full') ? '' : customText;

      const payload = {
        mode: mode,
        text: taskText,
        target_label: dominoTarget,
        event_text: dominoEventText,
        selected_modules: selectedModules,
        context_lines: contextLines,
        factions: factions,
        isolated_chars: isolatedChars,
        graph_context: graphContext
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

  const renderGuideDropdown = (tabKey) => {
    const guide = NARRATIVE_OPTIONS_GUIDE[tabKey];
    if (!guide) return null;
    const isOpen = Boolean(openGuides[tabKey]);

    return (
      <div style={{
        background: 'rgba(99, 102, 241, 0.05)',
        border: '1px solid rgba(99, 102, 241, 0.22)',
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '16px',
        transition: 'all 0.25s ease'
      }}>
        <button
          type="button"
          onClick={() => toggleGuide(tabKey)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: isOpen ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
            border: 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            color: '#a5b4fc',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'background 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>Guía de Uso & Qué hace ({guide.shortName})</span>
          </div>
          <span style={{ fontSize: '11px', color: isOpen ? '#818cf8' : '#94a3b8', fontWeight: 700 }}>
            {isOpen ? 'Ocultar Guía ▲' : 'Desplegar Instrucciones & Descripción ▼'}
          </span>
        </button>

        {isOpen && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(99, 102, 241, 0.15)', background: 'rgba(15, 23, 42, 0.7)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                ¿Qué es y qué hace?
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.55 }}>
                {guide.whatIs}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                ¿Para qué sirve?
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.55 }}>
                {guide.purpose}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Instrucciones de Uso Paso a Paso:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {guide.instructions.map((step, sIdx) => (
                  <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', lineHeight: 1.5 }}>
                    <span style={{ minWidth: '18px', height: '18px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>
                      {sIdx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {guide.modulesGuide && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Desglose de Dimensiones Evaluadas:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                  {guide.modulesGuide.map((m, mIdx) => (
                    <div key={mIdx} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc' }}>{m.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.4 }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {guide.example && (
              <div style={{ padding: '10px 12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', borderLeft: '3px solid #38bdf8' }}>
                <span style={{ fontSize: '12px', color: '#93c5fd', lineHeight: 1.45 }}>{guide.example}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredContexts = selectedContextFilter === 'all'
    ? timelineData.contexts
    : timelineData.contexts.filter(c => c.type === selectedContextFilter);

  return (
    <div className="view-container escriba-narrative-container" style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header Pro */}
      <div className="pro-view-header">
        <div>
          <h1 className="pro-view-title escriba-glow-text">
            ESCRIBA — Configuración Narrativa e Historia
          </h1>
          <p className="pro-view-subtitle">
            Contextos Multidimensionales, Cronología de Eras, Simulador Dominó y Auditoría Literaria.
          </p>
        </div>
      </div>

      {/* Tabs Principales Pro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResultData(null); }}
              className={`pro-card pro-card-interactive ${isActive ? 'pro-card-amber-active' : ''}`}
              style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: isActive ? '#fbbf24' : '#f1f5f9', fontSize: '14px', letterSpacing: '-0.01em' }}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="pro-badge pro-badge-amber" style={{ fontSize: '9.5px', padding: '2px 7px' }}>
                    <span className="pro-badge-dot" />
                    Activo
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11.5px', color: '#8b95a5', lineHeight: 1.4 }}>
                {tab.subtitle}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div style={{ display: 'grid', gridTemplateColumns: (resultData && activeTab !== 'contexts_timeline') ? '1fr 1fr' : '1fr', gap: '22px' }}>
        
        {/* Input Configuration Panel Pro */}
        <div className="pro-card" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* TAB 0: CONTEXTOS MULTIDIMENSIONALES & CRONOLOGÍA */}
          {activeTab === 'contexts_timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '17px', fontWeight: 700 }}>
                    Contextos Multidimensionales & Cronología Temporal
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Diseña los contextos del relato (políticos, religiosos, sociales, ideológicos) y define las eras y momentos clave.
                  </p>
                </div>

                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <button
                    type="button"
                    onClick={() => setTimelineSubView('contexts')}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
                      background: timelineSubView === 'contexts' ? '#6366f1' : 'transparent',
                      color: timelineSubView === 'contexts' ? '#fff' : '#94a3b8',
                      transition: 'all 0.2s'
                    }}
                  >
                    Contextos ({timelineData.contexts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineSubView('timeline')}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600,
                      background: timelineSubView === 'timeline' ? '#6366f1' : 'transparent',
                      color: timelineSubView === 'timeline' ? '#fff' : '#94a3b8',
                      transition: 'all 0.2s'
                    }}
                  >
                    Períodos & Línea de Tiempo ({timelineData.periods.length} eras / {timelineData.milestones.length} hitos)
                  </button>
                </div>
              </div>

              {renderGuideDropdown('contexts_timeline')}

              {/* SUB-VISTA 1: CONTEXTOS MULTIDIMENSIONALES */}
              {timelineSubView === 'contexts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Barra de Filtros y Creación */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedContextFilter('all')}
                        style={{
                          padding: '4px 10px', borderRadius: '16px', fontSize: '11.5px', cursor: 'pointer', border: 'none',
                          background: selectedContextFilter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.05)',
                          color: selectedContextFilter === 'all' ? '#fff' : '#94a3b8', fontWeight: 600
                        }}
                      >
                        Todos ({timelineData.contexts.length})
                      </button>
                      {CONTEXT_TYPES.map(ct => {
                        const count = timelineData.contexts.filter(c => c.type === ct.id).length;
                        const isSel = selectedContextFilter === ct.id;
                        return (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => setSelectedContextFilter(ct.id)}
                            style={{
                              padding: '4px 10px', borderRadius: '16px', fontSize: '11.5px', cursor: 'pointer',
                              background: isSel ? ct.color : ct.bg,
                              color: isSel ? '#000' : ct.color,
                              border: `1px solid ${ct.border}`,
                              fontWeight: 600
                            }}
                          >
                            {ct.label} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenCreateContext}
                      style={{
                        padding: '9px 20px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                        border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        boxShadow: '0 3px 12px rgba(124, 58, 237, 0.35)',
                        transition: 'transform 0.15s ease'
                      }}
                      title="Crear contexto narrativo (con opciones de Worldbuilding ficticio, investigación histórica real o redacción manual)"
                    >
                      <span style={{ fontSize: '15px' }}>+</span>
                      <span>Crear</span>
                    </button>
                  </div>

                  {/* Grid de Contextos */}
                  {filteredContexts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.15)' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#cbd5e1' }}>No hay contextos registrados en esta categoría.</p>
                      <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '14px' }}>
                        Pulsa en "Crear" para diseñar dinámicas políticas, religiosas, bélicas o sociales para tu historia.
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenCreateContext}
                        style={{
                          padding: '8px 18px', borderRadius: '8px',
                          background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                          border: 'none', color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer'
                        }}
                      >
                        + Crear Contexto
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                      {filteredContexts.map(ctx => {
                        const typeInfo = CONTEXT_TYPES.find(t => t.id === ctx.type) || CONTEXT_TYPES[0];
                        return (
                          <div
                            key={ctx.id}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${typeInfo.border}`,
                              borderRadius: '10px',
                              padding: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: '10.5px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '10px', background: typeInfo.bg, color: typeInfo.color, fontWeight: 700 }}>
                                  {typeInfo.label}
                                </span>
                                <h4 style={{ margin: '6px 0 0 0', fontSize: '16px', color: '#fff', fontWeight: 700 }}>{ctx.name}</h4>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditContext(ctx)}
                                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', fontSize: '11px', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteContext(ctx.id)}
                                  style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '11px', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                  X
                                </button>
                              </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5 }}>
                              {ctx.description}
                            </p>

                            {ctx.narrativeAngle && (
                              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                                <strong style={{ color: '#38bdf8', fontSize: '11px', textTransform: 'uppercase' }}>Ángulo Narrativo: </strong>
                                <span style={{ color: '#93c5fd' }}>{ctx.narrativeAngle}</span>
                              </div>
                            )}

                            {ctx.keyEntities && (
                              <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: 'auto' }}>
                                <span style={{ fontWeight: 600 }}>Entidades asociadas: </span>
                                <span style={{ color: '#e2e8f0' }}>{ctx.keyEntities}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VISTA 2: PERÍODOS DE TIEMPO & LÍNEA TEMPORAL */}
              {timelineSubView === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Barra de Acciones */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                      Organiza las eras históricas y sitúa momentos importantes a lo largo de la cronología de tu novela.
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleOpenNewPeriod}
                        style={{ padding: '7px 14px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Nuevo Período de Tiempo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenNewMilestone()}
                        style={{ padding: '7px 14px', borderRadius: '6px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        + Nuevo Momento Clave / Hito
                      </button>
                    </div>
                  </div>

                  {/* Visualizador de Línea de Tiempo */}
                  {timelineData.periods.length === 0 && timelineData.milestones.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.15)' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#cbd5e1' }}>Aún no has definido períodos temporales ni hitos cronológicos.</p>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Crea un período de tiempo (ej. "La Gran Tregua", "Siglo de las Sombras") y agrega momentos cruciales de la trama.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Renderizado de cada período con sus hitos */}
                      {timelineData.periods.map((period, pIdx) => {
                        const periodMilestones = timelineData.milestones.filter(m => m.periodId === period.id);
                        return (
                          <div
                            key={period.id}
                            style={{
                              background: 'rgba(15, 23, 42, 0.65)',
                              border: `1px solid ${period.color || '#6366f1'}40`,
                              borderRadius: '12px',
                              overflow: 'hidden',
                              boxShadow: '0 4px 18px rgba(0,0,0,0.3)'
                            }}
                          >
                            {/* Cabecera del Período */}
                            <div style={{
                              background: `linear-gradient(90deg, ${period.color || '#6366f1'}25, rgba(0,0,0,0.2))`,
                              borderBottom: `1px solid ${period.color || '#6366f1'}35`,
                              padding: '14px 18px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                  width: '10px', height: '10px', borderRadius: '50%',
                                  background: period.color || '#6366f1',
                                  boxShadow: `0 0 10px ${period.color || '#6366f1'}`
                                }} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h4 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: 700 }}>{period.name}</h4>
                                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.08)', color: '#38bdf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                      {period.timeRange || 'Rango no especificado'}
                                    </span>
                                  </div>
                                  {period.summary && (
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#cbd5e1' }}>{period.summary}</p>
                                  )}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenNewMilestone(period.id)}
                                  style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                  + Hito en esta Era
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPeriod(period)}
                                  style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePeriod(period.id)}
                                  style={{ padding: '4px 8px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '11.5px', borderRadius: '6px', cursor: 'pointer' }}
                                >
                                  X
                                </button>
                              </div>
                            </div>

                            {/* Hitos secuenciales de esta era */}
                            <div style={{ padding: '16px 20px' }}>
                              {periodMilestones.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>
                                  No hay hitos o momentos específicos asignados a este período todavía.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', paddingLeft: '22px' }}>
                                  {/* Línea vertical conectora */}
                                  <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '8px', width: '2px', background: `linear-gradient(180deg, ${period.color || '#6366f1'}, rgba(255,255,255,0.1))` }} />

                                  {periodMilestones.map((mile, mIdx) => (
                                    <div
                                      key={mile.id}
                                      style={{
                                        position: 'relative',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '8px',
                                        padding: '12px 14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px'
                                      }}
                                    >
                                      {/* Nodo en la línea */}
                                      <div style={{
                                        position: 'absolute', left: '-20px', top: '16px',
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: period.color || '#6366f1',
                                        boxShadow: `0 0 6px ${period.color || '#6366f1'}`
                                      }} />

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 7px', borderRadius: '4px' }}>
                                            {mile.moment || `Hito ${mIdx + 1}`}
                                          </span>
                                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                                            {mile.title}
                                          </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '4px' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditMilestone(mile)}
                                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteMilestone(mile.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}
                                          >
                                            X
                                          </button>
                                        </div>
                                      </div>

                                      {mile.description && (
                                        <p style={{ margin: 0, fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.45 }}>
                                          {mile.description}
                                        </p>
                                      )}

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#94a3b8', paddingTop: '4px' }}>
                                        {mile.characters && (
                                          <div>
                                            <span style={{ fontWeight: 600 }}>Personajes: </span>
                                            <span style={{ color: '#e2e8f0' }}>{mile.characters}</span>
                                          </div>
                                        )}
                                        {mile.impact && (
                                          <div style={{ color: '#38bdf8' }}>
                                            <span style={{ fontWeight: 600 }}>Impacto: </span>
                                            <span>{mile.impact}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Hitos huérfanos sin período asignado */}
                      {timelineData.milestones.filter(m => !m.periodId).length > 0 && (
                        <div style={{
                          background: 'rgba(15, 23, 42, 0.45)',
                          border: '1px dashed rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          padding: '16px 20px'
                        }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#94a3b8' }}>
                            Momentos e Hitos sin Período Temporal Asignado
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {timelineData.milestones.filter(m => !m.periodId).map(mile => (
                              <div key={mile.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px' }}>
                                <div>
                                  <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 600 }}>{mile.moment}</span>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{mile.title}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button type="button" onClick={() => handleOpenEditMilestone(mile)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Editar</button>
                                  <button type="button" onClick={() => handleDeleteMilestone(mile.id)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>X</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: SIMULADOR DOMINÓ */}
          {activeTab === 'domino' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Simulación de Efecto Dominó (What-If)</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Evalúa qué sucede cuando un personaje clave es envenenado, asesinado o derrocado.
                  </p>
                </div>
              </div>

              {renderGuideDropdown('domino')}

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
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Radiografía Histórica y Geopolítica</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Selecciona las dimensiones del mundo que deseas analizar a través del LLM:
                </p>
              </div>

              {renderGuideDropdown('historical')}

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
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Detector de Vacíos Narrativos</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Identifica personajes periféricos aislados y propone eventos puente para forzar fricción narrativa.
                </p>
              </div>

              {renderGuideDropdown('voids')}

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
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>Auditoría de Trama & Continuidad</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  El Supervisor de Continuidad revisa incongruencias temporales, agujeros de guion y tramas abandonadas.
                </p>
              </div>

              {renderGuideDropdown('audit')}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAuditScope('full')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none',
                    background: auditScope === 'full' ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Manuscrito Completo (Canva)
                </button>
                <button
                  type="button"
                  onClick={() => setAuditScope('custom')}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: '6px', border: 'none',
                    background: auditScope === 'custom' ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Fragmento Manual
                </button>
              </div>

              {auditScope === 'full' ? (
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                  <strong style={{ color: '#a5b4fc', display: 'block', marginBottom: '4px' }}>Auditoría Automática Integral:</strong>
                  El motor compilará y analizará automáticamente todos los capítulos redactados en el Canva para verificar la coherencia temporal, la evolución de los personajes y posibles agujeros de guion.
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Fragmento específico a auditar:</label>
                  <textarea
                    rows="4"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Inserta aquí el texto del capítulo o escena..."
                    style={{ width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              )}

              <button
                disabled={loading}
                onClick={() => handleRunTask('plot_audit')}
                style={{ padding: '12px', background: loading ? '#475569' : '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px' }}
              >
                {loading ? 'Auditando Manuscrito...' : (auditScope === 'full' ? 'Auditar Manuscrito Completo' : 'Auditar Fragmento')}
              </button>
            </>
          )}

        </div>

        {/* Results Panel */}
        {resultData && activeTab !== 'contexts_timeline' && (
          <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '520px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#a5b4fc' }}>Resultados del Motor ESCRIBA</span>
              <button onClick={() => setResultData(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Cerrar [X]</button>
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

            {/* R-10: FORMATTED MARKDOWN RESULTS */}
            {(resultData.analysis || resultData.suggestions || resultData.audit_report || resultData.response || resultData.report) && (
              <EscribaMarkdownRenderer
                content={resultData.analysis || resultData.suggestions || resultData.audit_report || resultData.response || resultData.report}
              />
            )}
          </div>
        )}

      </div>

      {/* MODAL UNIFICADO: CREAR / EDITAR CONTEXTO NARRATIVO PRO */}
      {contextModalOpen && (
        <div className="pro-modal-backdrop" onClick={() => setContextModalOpen(false)}>
          <div
            className="pro-modal-panel"
            style={{ maxWidth: '660px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pro-modal-header">
              <div>
                <h3 className="pro-modal-title">
                  {editingContext ? 'Editar Contexto Narrativo' : 'Crear Contexto Narrativo'}
                </h3>
                <span style={{ fontSize: '12px', color: '#8b95a5' }}>
                  Define sistemas de reglas, dinámicas geopolíticas, doctrinas o trasfondos para tu obra.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setContextModalOpen(false)}
                className="pro-btn pro-btn-ghost pro-btn-sm"
              >
                X
              </button>
            </div>

            <div className="pro-modal-body">
              {/* Selector de Método de Creación */}
              <div>
                <label className="pro-field-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Método de Creación:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Opción 1: Redacción Manual */}
                  <div
                    onClick={() => { setContextCreationMode('manual'); setContextAiSuccess(false); }}
                    className={`pro-card pro-card-interactive ${contextCreationMode === 'manual' ? 'pro-card-active' : ''}`}
                    style={{
                      padding: '12px 10px', textAlign: 'center', cursor: 'pointer',
                      background: contextCreationMode === 'manual' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(14, 17, 28, 0.6)'
                    }}
                  >
                    <div style={{ fontWeight: 650, fontSize: '12px', color: contextCreationMode === 'manual' ? '#a5b4fc' : '#f1f5f9' }}>
                      Redacción Propia (Sin IA)
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#8b95a5', marginTop: '3px', lineHeight: 1.3 }}>
                      Escribe directamente los campos sin intervención
                    </div>
                  </div>

                  {/* Opción 2: Ficticio con IA */}
                  <div
                    onClick={() => { setContextCreationMode('fictional'); setContextAiSuccess(false); }}
                    className={`pro-card pro-card-interactive ${contextCreationMode === 'fictional' ? 'pro-card-active' : ''}`}
                    style={{
                      padding: '12px 10px', textAlign: 'center', cursor: 'pointer',
                      background: contextCreationMode === 'fictional' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(14, 17, 28, 0.6)'
                    }}
                  >
                    <div style={{ fontWeight: 650, fontSize: '12px', color: contextCreationMode === 'fictional' ? '#d8b4fe' : '#f1f5f9' }}>
                      IA: Ficción Creativa
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#8b95a5', marginTop: '3px', lineHeight: 1.3 }}>
                      Normas, doctrinas o mitología inventada
                    </div>
                  </div>

                  {/* Opción 3: Histórico Real con IA */}
                  <div
                    onClick={() => { setContextCreationMode('historical'); setContextAiSuccess(false); }}
                    className={`pro-card pro-card-interactive ${contextCreationMode === 'historical' ? 'pro-card-amber-active' : ''}`}
                    style={{
                      padding: '12px 10px', textAlign: 'center', cursor: 'pointer',
                      background: contextCreationMode === 'historical' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(14, 17, 28, 0.6)'
                    }}
                  >
                    <div style={{ fontWeight: 650, fontSize: '12px', color: contextCreationMode === 'historical' ? '#fcd34d' : '#f1f5f9' }}>
                      IA: Investigación Histórica
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#8b95a5', marginTop: '3px', lineHeight: 1.3 }}>
                      Hechos verídicos, tratados e instituciones
                    </div>
                  </div>
                </div>
              </div>

            {/* SECCION ASISTIDA POR IA (si el modo es Ficcion o Historico) */}
            {contextCreationMode !== 'manual' && (
              <div style={{
                background: contextCreationMode === 'historical'
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(180, 83, 9, 0.06))'
                  : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(99, 102, 241, 0.06))',
                border: `1px solid ${contextCreationMode === 'historical' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(168, 85, 247, 0.35)'}`,
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12.5px', fontWeight: 700,
                    color: contextCreationMode === 'historical' ? '#fcd34d' : '#d8b4fe'
                  }}>
                    {contextCreationMode === 'historical' ? 'Investigador Historico de ESCRIBA' : 'Generador de Ficcion de ESCRIBA'}
                  </span>
                  {contextAiSuccess && (
                    <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
                      [Campos completados]
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#cbd5e1', marginBottom: '5px', fontWeight: 600 }}>
                    {contextCreationMode === 'historical'
                      ? 'Que hecho, tratado, conflicto o periodo historico deseas investigar y documentar?'
                      : 'Que idea, tematica o doctrina deseas que la IA desarrolle para este contexto?'}
                  </label>
                  <textarea
                    rows="2"
                    value={contextAiPrompt}
                    onChange={(e) => setContextAiPrompt(e.target.value)}
                    placeholder={contextCreationMode === 'historical'
                      ? "Ej: 'Tratado de Versalles y su impacto socioeconomico', 'Guerra Iran-Irak y la batalla por el estuario de Shatt al-Arab', 'Leyes suntuarias medievales'..."
                      : "Ej: 'Una doctrina militar que prohibe la polvora y destierra a desertores a minas de hielo', 'Un culto subterraneo que venera mareas'..."
                    }
                    style={{
                      width: '100%', padding: '8px 10px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${contextCreationMode === 'historical' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(168, 85, 247, 0.4)'}`,
                      borderRadius: '6px',
                      color: '#fff', fontSize: '12.5px', resize: 'vertical'
                    }}
                  />
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                    {contextCreationMode === 'historical'
                      ? '(Si lo dejas vacio, investigara un contexto historico veridico relevante para la epoca del proyecto)'
                      : '(Si lo dejas vacio, generara una propuesta creativa adaptada al genero y tono de la novela)'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    disabled={contextAiLoading}
                    onClick={() => handleExecuteAiGenerationForContext(contextCreationMode)}
                    style={{
                      padding: '8px 18px', borderRadius: '6px',
                      background: contextAiLoading
                        ? '#475569'
                        : (contextCreationMode === 'historical'
                            ? 'linear-gradient(135deg, #f59e0b, #b45309)'
                            : 'linear-gradient(135deg, #a855f7, #6366f1)'),
                      border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700,
                      cursor: contextAiLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: contextCreationMode === 'historical' ? '0 2px 10px rgba(245, 158, 11, 0.3)' : '0 2px 10px rgba(168, 85, 247, 0.3)'
                    }}
                  >
                    <span>
                      {contextAiLoading
                        ? (contextCreationMode === 'historical' ? 'Investigando fuentes historicas...' : 'Generando propuesta...')
                        : (contextCreationMode === 'historical' ? 'Investigar y rellenar campos' : 'Generar y rellenar campos')}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* CAMPOS DEL FORMULARIO (Siempre editables por el autor) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Dimensión / Tipo */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                  Dimensión o Ámbito:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px' }}>
                  {CONTEXT_TYPES.map(ct => {
                    const isSelected = contextForm.type === ct.id;
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => handleChangeContextDimension(ct.id)}
                        style={{
                          padding: '6px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600,
                          background: isSelected ? ct.color : ct.bg,
                          color: isSelected ? '#000' : ct.color,
                          border: `1px solid ${ct.border}`,
                          cursor: 'pointer', textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {ct.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>
                    Título o Nombre del Contexto (Opcional):
                  </label>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Por defecto: {contextForm.name || ('Contexto ' + (CONTEXT_TYPES.find(t => t.id === contextForm.type)?.label || ''))}
                  </span>
                </div>
                <input
                  type="text"
                  value={contextForm.name}
                  onChange={(e) => setContextForm({ ...contextForm, name: e.target.value })}
                  placeholder={`ej. Contexto ${(CONTEXT_TYPES.find(t => t.id === contextForm.type)?.label || '')}`}
                  style={{
                    width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                    color: '#fff', fontSize: '13px'
                  }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px', fontWeight: 600 }}>
                  Descripción de las Dinámicas, Reglas o Hechos:
                </label>
                <textarea
                  rows="3"
                  value={contextForm.description}
                  onChange={(e) => setContextForm({ ...contextForm, description: e.target.value })}
                  placeholder="Detalla cómo opera este ámbito (leyes, dogmas, tratados históricos, estratificación social, economía de guerra)..."
                  style={{
                    width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                    color: '#fff', fontSize: '12.5px', lineHeight: 1.5, resize: 'vertical'
                  }}
                />
              </div>

              {/* Ángulo Literario */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px', fontWeight: 600 }}>
                  Ángulo Dramático / Fricción en la Trama:
                </label>
                <input
                  type="text"
                  value={contextForm.narrativeAngle}
                  onChange={(e) => setContextForm({ ...contextForm, narrativeAngle: e.target.value })}
                  placeholder="ej. Genera desconfianza entre el protagonista y las autoridades eclesiásticas..."
                  style={{
                    width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                    color: '#fff', fontSize: '12.5px'
                  }}
                />
              </div>

              {/* Entidades Vinculadas */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '5px', fontWeight: 600 }}>
                  Entidades, Familias, Facciones o Instituciones Clave:
                </label>
                <input
                  type="text"
                  value={contextForm.keyEntities}
                  onChange={(e) => setContextForm({ ...contextForm, keyEntities: e.target.value })}
                  placeholder="ej. República de Weimar, Guardia Revolucionaria, Casa Val-Moria (separadas por comas)..."
                  style={{
                    width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px',
                    color: '#fff', fontSize: '12.5px'
                  }}
                />
              </div>
            </div>
            </div>

            {/* Footer Pro */}
            <div className="pro-modal-footer">
              <button
                type="button"
                onClick={() => setContextModalOpen(false)}
                className="pro-btn pro-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveContext}
                className="pro-btn pro-btn-primary"
              >
                Guardar Contexto
              </button>
            </div>
          </div>
        </div>
      )}



      {/* MODAL: NUEVO / EDITAR PERÍODO DE TIEMPO */}
      {periodModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: 700 }}>
                {editingPeriod ? 'Editar Período de Tiempo' : 'Definir Nuevo Período de Tiempo (Era / Época)'}
              </h3>
              <button type="button" onClick={() => setPeriodModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>X</button>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Nombre del Período / Era:</label>
              <input
                type="text"
                value={periodForm.name}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                placeholder="ej. Era de la Ruptura, La Gran Tregua, El Siglo del Hierro..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Rango Temporal:</label>
                <input
                  type="text"
                  value={periodForm.timeRange}
                  onChange={(e) => setPeriodForm({ ...periodForm, timeRange: e.target.value })}
                  placeholder="ej. Año 0 al 145, Siglo V, Primavera 1914..."
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Color Distintivo:</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '38px' }}>
                  {['#38bdf8', '#818cf8', '#c084fc', '#4ade80', '#fbbf24', '#f87171'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setPeriodForm({ ...periodForm, color: col })}
                      style={{
                        width: '26px', height: '26px', borderRadius: '50%', background: col, border: periodForm.color === col ? '2px solid #fff' : 'none', cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Atmósfera y Resumen del Período:</label>
              <textarea
                rows="3"
                value={periodForm.summary}
                onChange={(e) => setPeriodForm({ ...periodForm, summary: e.target.value })}
                placeholder="Describe el clima general del mundo en esta época, conflictos dominantes o situación de los reinos..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button type="button" onClick={() => setPeriodModalOpen(false)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
              <button type="button" onClick={handleSavePeriod} style={{ padding: '8px 18px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>Guardar Período</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR MOMENTO CLAVE / HITO */}
      {milestoneModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '14px', width: '100%', maxWidth: '540px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#fff', fontWeight: 700 }}>
                {editingMilestone ? 'Editar Momento Importante' : 'Ubicar Momento Clave en la Línea de Tiempo'}
              </h3>
              <button type="button" onClick={() => setMilestoneModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>X</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Título del Momento / Hito:</label>
                <input
                  type="text"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="ej. Caída de la Fortaleza Este, Traición en el Río..."
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Momento / Fecha:</label>
                <input
                  type="text"
                  value={milestoneForm.moment}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, moment: e.target.value })}
                  placeholder="ej. Año 104, Cap. 3..."
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Período al que pertenece:</label>
              <select
                value={milestoneForm.periodId}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, periodId: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              >
                <option value="">-- Sin período específico (Momento General) --</option>
                {timelineData.periods.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.timeRange || 'Sin rango'})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Descripción del Acontecimiento:</label>
              <textarea
                rows="3"
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                placeholder="¿Qué ocurrió en este momento específico y cómo altera el destino de los involucrados?..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Personajes Involucrados:</label>
                <input
                  type="text"
                  value={milestoneForm.characters}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, characters: e.target.value })}
                  placeholder="ej. Comandante Ryan, La Reina Elena..."
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: 600 }}>Impacto en la Novela:</label>
                <input
                  type="text"
                  value={milestoneForm.impact}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, impact: e.target.value })}
                  placeholder="ej. Detona la huida del heredero..."
                  style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button type="button" onClick={() => setMilestoneModalOpen(false)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>Cancelar</button>
              <button type="button" onClick={handleSaveMilestone} style={{ padding: '8px 18px', background: '#d97706', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}>Guardar Momento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

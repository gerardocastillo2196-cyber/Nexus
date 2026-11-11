import React, { useState, useEffect } from 'react';
import EscribaMarkdownRenderer from './EscribaMarkdownRenderer';

const CATEGORIES = [
  { id: 'character', label: 'Personajes', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.12)' },
  { id: 'location', label: 'Lugares', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  { id: 'faction', label: 'Facciones', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'event', label: 'Eventos', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' }
];

const TROPE_PRESETS = [
  { id: 'heroe_tragico', name: 'El Héroe Trágico', role: 'Protagonista', desc: 'Destinado a la grandeza pero condenado por su propia falla moral.' },
  { id: 'elegido_renuente', name: 'El Elegido Renuente', role: 'Protagonista', desc: 'Rechaza la carga del destino; su arco trata sobre asumir la responsabilidad.' },
  { id: 'antiheroe_cinico', name: 'El Antihéroe Cínico', role: 'Protagonista', desc: 'Descree de ideales puros, actúa por pragmatismo hasta que algo lo quiebra.' },
  { id: 'rebelde_iluso', name: 'El Rebelde Iluso', role: 'Protagonista', desc: 'Cree que derrocar al sistema actual solucionará el caos automáticamente.' },
  { id: 'extranjero_aislado', name: 'El Extranjero en Tierra Hostil', role: 'Protagonista', desc: 'Observador lúcido que no pertenece a ninguna facción pero debe intervenir.' },
  { id: 'villano_bienintencionado', name: 'El Extremista Bienintencionado', role: 'Antagonista', desc: 'Persigue una causa noble mediante métodos monstruosos. Cree ser el verdadero salvador.' },
  { id: 'sombra_del_heroe', name: 'La Sombra del Héroe', role: 'Antagonista', desc: 'Mismo origen o trauma que el protagonista, pero tomó la decisión destructiva opuesta.' },
  { id: 'nihilista_destructor', name: 'El Nihilista Destructor', role: 'Antagonista', desc: 'Descubrió que el mundo es hipócrita y quiere arrasarlo para liberar a todos del engaño.' },
  { id: 'traidor_intimo', name: 'El Traidor Íntimo', role: 'Antagonista', desc: 'Antiguo aliado o hermano jurado que desertó por una verdad inconfesable.' },
  { id: 'burocrata_implacable', name: 'El Burócrata Implacable', role: 'Antagonista', desc: 'No odia al héroe; simplemente ejecuta la maquinaria del sistema sin piedad ni empatía.' },
  { id: 'mentor_desencantado', name: 'El Mentor Desencantado', role: 'Secundario/Mentor', desc: 'Antiguo héroe que vio caer su causa y ahora instruye con amargura y secretos.' }
];

export default function EscribaEntitiesView({ onNavigate, onSendMessage }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [activeTab, setActiveTab] = useState('character');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  // Modal CRUD clásico
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  
  const [label, setLabel] = useState('');
  const [type, setType] = useState('character');
  const [role, setRole] = useState('');
  const [context, setContext] = useState('');
  const [attrPersonality, setAttrPersonality] = useState('');
  const [attrMotivations, setAttrMotivations] = useState('');
  const [attrSecrets, setAttrSecrets] = useState('');
  const [attrStatus, setAttrStatus] = useState('Activo');

  // ── Estados del Laboratorio de Protagonistas, Antagonistas y Tropos ────────
  const [showLabModal, setShowLabModal] = useState(false);
  const [labMode, setLabMode] = useState('tandem'); // 'tandem' | 'individual'

  const [labProtagonist, setLabProtagonist] = useState({
    name: '',
    role: 'Protagonista',
    trope: 'El Héroe Trágico',
    treatment: 'Subvertido',
    manifestation: '',
    twist: '',
    desire: '',
    need: '',
    wound: '',
    lie: '',
    fatal_flaw: ''
  });

  const [labAntagonist, setLabAntagonist] = useState({
    name: '',
    role: 'Antagonista',
    trope: 'El Extremista Bienintencionado',
    treatment: 'Deconstruido',
    manifestation: '',
    twist: '',
    desire: '',
    need: '',
    wound: '',
    lie: '',
    fatal_flaw: ''
  });

  const [labDilemma, setLabDilemma] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestingTarget, setSuggestingTarget] = useState('protagonist');
  const [suggestedOptions, setSuggestedOptions] = useState([]);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);

  const [isSimulatingDebate, setIsSimulatingDebate] = useState(false);
  const [simulatedDebate, setSimulatedDebate] = useState('');
  const [isSavingLab, setIsSavingLab] = useState(false);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escriba/graph');
      if (res.ok) {
        const data = await res.json();
        setGraphData(data || { nodes: [], links: [] });
      }
    } catch (err) {
      console.error('Error al cargar entidades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleAutoExtract = async () => {
    setIsExtracting(true);
    setFeedbackMsg('Analizando manuscrito y extrayendo personajes, lugares y facciones con IA...');
    try {
      const res = await fetch('/api/escriba/graph/extract', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.graph) {
          setGraphData(data.graph);
        } else {
          await fetchGraph();
        }
        setFeedbackMsg(data.message || 'Catálogo de entidades y grafo sincronizados correctamente.');
        setTimeout(() => setFeedbackMsg(''), 6000);
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedbackMsg('Aviso: ' + (err.detail || 'No se pudo completar la extracción automática.'));
        setTimeout(() => setFeedbackMsg(''), 5000);
      }
    } catch (err) {
      console.error('Error en extracción de entidades:', err);
      setFeedbackMsg('Error de conexión al extraer entidades desde el manuscrito.');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } finally {
      setIsExtracting(false);
    }
  };

  // Abrir modal CRUD estándar
  const openCreateModal = (categoryType = activeTab) => {
    setEditingNode(null);
    setLabel('');
    setType(categoryType);
    setRole('');
    setContext('');
    setAttrPersonality('');
    setAttrMotivations('');
    setAttrSecrets('');
    setAttrStatus('Activo');
    setShowModal(true);
  };

  const openEditModal = (node) => {
    setEditingNode(node);
    setLabel(node.label || '');
    setType(node.type || 'character');
    const attrs = node.attributes || {};
    setRole(attrs.role || '');
    setContext(attrs.context || node.description || '');
    setAttrPersonality(attrs.personality || attrs.ideology || attrs.atmosphere || '');
    setAttrMotivations(attrs.motivations || attrs.goals || attrs.significance || '');
    setAttrSecrets(attrs.secrets || attrs.leader || attrs.controlling_faction || '');
    setAttrStatus(attrs.status || 'Activo');
    setShowModal(true);
  };

  const handleSaveNode = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    const nodePayload = {
      id: editingNode ? editingNode.id : undefined,
      label: label.trim(),
      type: type,
      description: context,
      attributes: {
        ...(editingNode?.attributes || {}),
        role: role.trim(),
        context: context.trim(),
        status: attrStatus,
        personality: attrPersonality.trim(),
        motivations: attrMotivations.trim(),
        secrets: attrSecrets.trim()
      }
    };

    try {
      const res = await fetch('/api/escriba/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nodePayload)
      });
      if (res.ok) {
        setShowModal(false);
        await fetchGraph();
        setFeedbackMsg(`Entidad "${label}" guardada con éxito.`);
        setTimeout(() => setFeedbackMsg(''), 4000);
      } else {
        alert('Error al guardar la entidad.');
      }
    } catch (err) {
      console.error('Error guardando nodo:', err);
    }
  };

  const handleDelete = async (nodeId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta entidad del catálogo y del grafo?')) return;
    try {
      const res = await fetch(`/api/escriba/node/${nodeId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchGraph();
        setFeedbackMsg('Entidad eliminada del proyecto.');
        setTimeout(() => setFeedbackMsg(''), 3000);
      }
    } catch (err) {
      console.error('Error al eliminar entidad:', err);
    }
  };

  // ── Métodos del Laboratorio de Protagonistas, Antagonistas y Tropos ────────

  const openLaboratoryModal = () => {
    setLabMode('tandem');
    setLabProtagonist({
      name: '',
      role: 'Protagonista',
      trope: 'El Héroe Trágico',
      treatment: 'Subvertido',
      manifestation: '',
      twist: '',
      desire: '',
      need: '',
      wound: '',
      lie: '',
      fatal_flaw: ''
    });
    setLabAntagonist({
      name: '',
      role: 'Antagonista',
      trope: 'El Extremista Bienintencionado',
      treatment: 'Deconstruido',
      manifestation: '',
      twist: '',
      desire: '',
      need: '',
      wound: '',
      lie: '',
      fatal_flaw: ''
    });
    setLabDilemma('');
    setAuditResult(null);
    setSuggestedOptions([]);
    setSimulatedDebate('');
    setShowLabModal(true);
  };

  const openLabForCharacter = (charNode) => {
    const attrs = charNode.attributes || {};
    const np = attrs.narrative_profile || {};
    const tp = np.trope_profile || {};
    const psych = np.psychology || {};

    setLabMode('individual');
    setLabProtagonist({
      name: charNode.label || '',
      role: attrs.role || 'Protagonista',
      trope: tp.trope || 'El Héroe Trágico',
      treatment: tp.treatment || 'Subvertido',
      manifestation: tp.manifestation || attrs.context || charNode.description || '',
      twist: tp.twist || '',
      desire: psych.desire || '',
      need: psych.need || '',
      wound: psych.wound || attrs.secrets || '',
      lie: psych.lie || '',
      fatal_flaw: psych.fatal_flaw || ''
    });
    setAuditResult(null);
    setSuggestedOptions([]);
    setSimulatedDebate('');
    setShowLabModal(true);
  };

  const handleSuggestTrope = async (targetRole) => {
    const targetChar = targetRole === 'protagonist' ? labProtagonist : labAntagonist;
    setIsSuggesting(true);
    setSuggestingTarget(targetRole);
    setSuggestedOptions([]);
    try {
      const res = await fetch('/api/escriba/laboratory/suggest-enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trope_name: targetChar.trope || 'Arquetipo Clásico',
          character_name: targetChar.name || (targetRole === 'protagonist' ? 'Protagonista' : 'Antagonista'),
          role: targetChar.role || (targetRole === 'protagonist' ? 'Protagonista' : 'Antagonista')
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedOptions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Error pidiendo sugerencias de tropo:', err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const applyTropeSuggestion = (sug) => {
    if (suggestingTarget === 'protagonist') {
      setLabProtagonist(prev => ({
        ...prev,
        treatment: sug.treatment || prev.treatment,
        manifestation: sug.manifestation || prev.manifestation,
        twist: sug.twist || prev.twist
      }));
    } else {
      setLabAntagonist(prev => ({
        ...prev,
        treatment: sug.treatment || prev.treatment,
        manifestation: sug.manifestation || prev.manifestation,
        twist: sug.twist || prev.twist
      }));
    }
  };

  const handleAuditTension = async () => {
    if (!labProtagonist.name && !labAntagonist.name) {
      alert('Por favor define al menos los nombres de los personajes para auditar su oposición dramática.');
      return;
    }
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await fetch('/api/escriba/laboratory/audit-tension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protagonist: {
            name: labProtagonist.name,
            role: labProtagonist.role,
            trope_profile: {
              trope: labProtagonist.trope,
              treatment: labProtagonist.treatment,
              manifestation: labProtagonist.manifestation,
              twist: labProtagonist.twist
            },
            psychology: {
              desire: labProtagonist.desire,
              need: labProtagonist.need,
              wound: labProtagonist.wound,
              lie: labProtagonist.lie,
              fatal_flaw: labProtagonist.fatal_flaw
            }
          },
          antagonist: {
            name: labAntagonist.name,
            role: labAntagonist.role,
            trope_profile: {
              trope: labAntagonist.trope,
              treatment: labAntagonist.treatment,
              manifestation: labAntagonist.manifestation,
              twist: labAntagonist.twist
            },
            psychology: {
              desire: labAntagonist.desire,
              need: labAntagonist.need,
              wound: labAntagonist.wound,
              lie: labAntagonist.lie,
              fatal_flaw: labAntagonist.fatal_flaw
            }
          },
          dilemma: labDilemma
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAuditResult(data.audit);
      }
    } catch (err) {
      console.error('Error auditando tensión:', err);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSimulateDebate = async () => {
    const charAName = labProtagonist.name.trim() || 'Protagonista';
    const charBName = labAntagonist.name.trim() || 'Antagonista';
    const dilemmaText = labDilemma.trim() || '¿Es justificable sacrificar los principios individuales por el bien común?';

    setIsSimulatingDebate(true);
    setSimulatedDebate('');
    try {
      const res = await fetch('/api/escriba/character-debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dilemma: dilemmaText,
          char_a_id: charAName,
          char_b_id: charBName
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedDebate(data.debate_transcript || data.dialogue || 'Sin diálogo generado.');
      }
    } catch (err) {
      console.error('Error simulando debate:', err);
    } finally {
      setIsSimulatingDebate(false);
    }
  };

  const handleSaveLaboratory = async () => {
    if (!labProtagonist.name.trim()) {
      alert('Debes ingresar al menos el nombre del personaje principal.');
      return;
    }
    if (labMode === 'tandem' && !labAntagonist.name.trim()) {
      alert('En modo díada debes ingresar el nombre de ambos personajes.');
      return;
    }

    setIsSavingLab(true);
    try {
      const payload = {
        dilemma: labDilemma.trim(),
        protagonist: {
          name: labProtagonist.name.trim(),
          role: labProtagonist.role,
          description: labProtagonist.manifestation || `Arquetipo: ${labProtagonist.trope} (${labProtagonist.treatment})`,
          trope_profile: {
            trope: labProtagonist.trope,
            treatment: labProtagonist.treatment,
            manifestation: labProtagonist.manifestation.trim(),
            twist: labProtagonist.twist.trim()
          },
          psychology: {
            desire: labProtagonist.desire.trim(),
            need: labProtagonist.need.trim(),
            wound: labProtagonist.wound.trim(),
            lie: labProtagonist.lie.trim(),
            fatal_flaw: labProtagonist.fatal_flaw.trim()
          }
        },
        antagonist: labMode === 'tandem' ? {
          name: labAntagonist.name.trim(),
          role: labAntagonist.role,
          description: labAntagonist.manifestation || `Arquetipo: ${labAntagonist.trope} (${labAntagonist.treatment})`,
          trope_profile: {
            trope: labAntagonist.trope,
            treatment: labAntagonist.treatment,
            manifestation: labAntagonist.manifestation.trim(),
            twist: labAntagonist.twist.trim()
          },
          psychology: {
            desire: labAntagonist.desire.trim(),
            need: labAntagonist.need.trim(),
            wound: labAntagonist.wound.trim(),
            lie: labAntagonist.lie.trim(),
            fatal_flaw: labAntagonist.fatal_flaw.trim()
          }
        } : null
      };

      const res = await fetch('/api/escriba/laboratory/save-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setShowLabModal(false);
        await fetchGraph();
        setFeedbackMsg(data.message || 'Arquitectura dramática inyectada exitosamente en el universo.');
        setTimeout(() => setFeedbackMsg(''), 6000);
      } else {
        alert('Error guardando en el laboratorio.');
      }
    } catch (err) {
      console.error('Error guardando laboratorio:', err);
    } finally {
      setIsSavingLab(false);
    }
  };

  const allNodes = graphData.nodes || [];
  const currentCategory = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0];
  
  const filteredNodes = allNodes.filter(n => {
    const isCategory = n.type === activeTab || 
      (activeTab === 'character' && n.type === 'personaje') ||
      (activeTab === 'location' && n.type === 'lugar') ||
      (activeTab === 'faction' && (n.type === 'faccion' || n.type === 'facción')) ||
      (activeTab === 'event' && n.type === 'evento');
    if (!isCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const l = (n.label || '').toLowerCase();
    const d = (n.description || '').toLowerCase();
    const r = (n.attributes?.role || '').toLowerCase();
    const c = (n.attributes?.context || '').toLowerCase();
    const t = (n.attributes?.narrative_profile?.trope_profile?.trope || '').toLowerCase();
    return l.includes(q) || d.includes(q) || r.includes(q) || c.includes(q) || t.includes(q);
  });

  return (
    <div style={{ padding: '30px', maxWidth: '1400px', margin: '0 auto', color: '#f8fafc', height: '100%', overflowY: 'auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: '#ffffff' }}>
            Catálogo de Entidades y Arquetipos
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Catálogo semántico integral sincronizado con el Grafo Narrativo, el Laboratorio de Tropos y el Manuscrito del proyecto.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Botón Destacado: Laboratorio de Protagonistas & Tropos */}
          <button
            onClick={openLaboratoryModal}
            className="pro-btn"
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.6)',
              color: '#f3e8ff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(168, 85, 247, 0.2)'
            }}
            title="Abrir el Laboratorio para forjar Protagonistas, Antagonistas y deconstruir tropos narrativos"
          >
            <span>+ Laboratorio de Protagonistas &amp; Tropos</span>
          </button>

          <button
            onClick={handleAutoExtract}
            disabled={isExtracting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: isExtracting ? 'rgba(52, 211, 153, 0.1)' : 'rgba(52, 211, 153, 0.2)',
              border: '1px solid #34d399',
              color: '#6ee7b7',
              fontWeight: 700,
              fontSize: '13px',
              cursor: isExtracting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Extrae y actualiza automáticamente los personajes, lugares y facciones desde el texto del manuscrito con prevención de duplicados"
          >
            {isExtracting ? 'Sincronizando con Manuscrito...' : 'Auto-Extraer desde Manuscrito'}
          </button>

          <button
            onClick={() => openCreateModal()}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#6366f1',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            + Agregar {currentCategory.label.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMsg && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: feedbackMsg.startsWith('Aviso') ? 'rgba(251, 191, 36, 0.15)' : 'rgba(52, 211, 153, 0.15)',
          border: feedbackMsg.startsWith('Aviso') ? '1px solid #fbbf24' : '1px solid #34d399',
          color: feedbackMsg.startsWith('Aviso') ? '#fde68a' : '#a7f3d0'
        }}>
          {feedbackMsg}
        </div>
      )}

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        {CATEGORIES.map(cat => {
          const count = allNodes.filter(n => n.type === cat.id || 
            (cat.id === 'character' && n.type === 'personaje') ||
            (cat.id === 'location' && n.type === 'lugar') ||
            (cat.id === 'faction' && (n.type === 'faccion' || n.type === 'facción')) ||
            (cat.id === 'event' && n.type === 'evento')
          ).length;
          const isActive = activeTab === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? cat.bg : 'rgba(255,255,255,0.03)',
                color: isActive ? cat.color : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? `2px solid ${cat.color}` : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <span>{cat.label}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 700 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Buscar en ${currentCategory.label}...`}
          style={{ padding: '8px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', width: '280px', fontSize: '13px' }}
        />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Mostrando {filteredNodes.length} de {allNodes.filter(n => n.type === activeTab).length} registros
          </span>
          <button
            onClick={() => onNavigate('escriba_graph')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              color: '#a5b4fc',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Ver Grafo Semántico
          </button>
        </div>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Cargando catálogo de entidades...
        </div>
      ) : filteredNodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)' }}>
          <p style={{ color: '#94a3b8', marginBottom: '14px', fontSize: '14px' }}>
            No hay {currentCategory.label.toLowerCase()} registrados en este proyecto.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              onClick={handleAutoExtract}
              disabled={isExtracting}
              style={{ padding: '8px 16px', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid #34d399', borderRadius: '6px', color: '#6ee7b7', fontWeight: 700, cursor: 'pointer' }}
            >
              Extraer Automáticamente del Manuscrito
            </button>
            <button
              onClick={() => openCreateModal()}
              style={{ padding: '8px 16px', background: '#6366f1', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              + Crear Primer {currentCategory.label.slice(0, -1)}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredNodes.map(entity => {
            const attrs = entity.attributes || {};
            const narrativeProfile = attrs.narrative_profile || {};
            const tropeProfile = narrativeProfile.trope_profile || {};
            const psychology = narrativeProfile.psychology || {};

            const connections = (graphData.links || []).filter(l => {
              const s = String(l.source || '').toLowerCase().trim();
              const t = String(l.target || '').toLowerCase().trim();
              const nid = String(entity.id || '').toLowerCase().trim();
              const nlab = String(entity.label || '').toLowerCase().trim();
              return s === nid || s === nlab || t === nid || t === nlab;
            });

            return (
              <div
                key={entity.id}
                style={{
                  background: '#0f172a',
                  border: tropeProfile.trope ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  position: 'relative',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                  transition: 'border-color 0.2s, transform 0.2s'
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '4px', background: currentCategory.bg, color: currentCategory.color, fontWeight: 700, letterSpacing: '0.5px' }}>
                        {currentCategory.label.slice(0, -1)}
                      </span>
                      {attrs.status && (
                        <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontWeight: 600 }}>
                          {attrs.status}
                        </span>
                      )}
                      {tropeProfile.trope && (
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.4)', fontWeight: 700 }}>
                          Tropo: {tropeProfile.trope} ({tropeProfile.treatment || 'Subvertido'})
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#ffffff', fontWeight: 700, lineHeight: 1.3 }}>
                      {entity.label}
                    </h3>
                    {attrs.role && (
                      <span style={{ fontSize: '12px', color: currentCategory.color, fontWeight: 600, display: 'block', marginTop: '3px' }}>
                        {attrs.role}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {entity.type === 'character' && (
                      <button
                        onClick={() => openLabForCharacter(entity)}
                        title="Enriquecer con Tropos y Psicología Profunda en el Laboratorio"
                        style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#d8b4fe', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                      >
                        Laboratorio
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(entity)}
                      title="Editar Entidad"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(entity.id)}
                      title="Eliminar Entidad"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Context Description */}
                <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px', borderLeft: `3px solid ${currentCategory.color}` }}>
                  {attrs.context || entity.description || 'Sin descripción contextual registrada.'}
                </p>

                {/* Specific Deep Attributes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  {entity.type === 'character' && (
                    <>
                      {tropeProfile.twist && (
                        <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#d8b4fe', fontWeight: 700, display: 'block', marginBottom: '2px' }}>Ancla Anti-Cliché / Giro:</span>
                          <span style={{ color: '#f5f3ff' }}>{tropeProfile.twist}</span>
                        </div>
                      )}
                      {(psychology.desire || psychology.need) && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Deseo vs Necesidad:</span>
                          <span style={{ color: '#e2e8f0' }}>Querer: {psychology.desire || 'No definido'} — Necesitar: {psychology.need || 'No definido'}</span>
                        </div>
                      )}
                      {attrs.personality && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Psicología y Voz:</span>
                          <span style={{ color: '#e2e8f0' }}>{attrs.personality}</span>
                        </div>
                      )}
                      {attrs.motivations && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Motivaciones Nucleares:</span>
                          <span style={{ color: '#e2e8f0' }}>{attrs.motivations}</span>
                        </div>
                      )}
                      {attrs.secrets && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Secretos / Vulnerabilidades:</span>
                          <span style={{ color: '#fef3c7' }}>{attrs.secrets}</span>
                        </div>
                      )}
                    </>
                  )}

                  {entity.type === 'location' && (
                    <>
                      {attrs.atmosphere && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Atmósfera Sensorial:</span>
                          <span style={{ color: '#e2e8f0' }}>{attrs.atmosphere}</span>
                        </div>
                      )}
                      {attrs.significance && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Importancia Estratégica:</span>
                          <span style={{ color: '#e2e8f0' }}>{attrs.significance}</span>
                        </div>
                      )}
                      {attrs.controlling_faction && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Dominio / Control:</span>
                          <span style={{ color: '#6ee7b7' }}>{attrs.controlling_faction}</span>
                        </div>
                      )}
                    </>
                  )}

                  {entity.type === 'faction' && (
                    <>
                      {attrs.ideology && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Ideología y Principios:</span>
                          <span style={{ color: '#e2e8f0' }}>{attrs.ideology}</span>
                        </div>
                      )}
                      {attrs.goals && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Objetivos Principales:</span>
                          <span style={{ color: '#e2e8f0' }}>{attrs.goals}</span>
                        </div>
                      )}
                      {attrs.leader && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Cúpula / Liderazgo:</span>
                          <span style={{ color: '#fcd34d' }}>{attrs.leader}</span>
                        </div>
                      )}
                    </>
                  )}

                  {entity.type === 'event' && (
                    <>
                      {attrs.consequences && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Consecuencias en la Trama:</span>
                          <span style={{ color: '#fca5a5' }}>{attrs.consequences}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Direct Relations List */}
                {connections.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      Conexiones en el Grafo ({connections.length}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                      {connections.slice(0, 5).map((l, i) => {
                        const s = String(l.source || '').toLowerCase().trim();
                        const nid = String(entity.id || '').toLowerCase().trim();
                        const nlab = String(entity.label || '').toLowerCase().trim();
                        const otherKey = (s === nid || s === nlab) ? l.target : l.source;
                        const otherKeyLower = String(otherKey || '').toLowerCase().trim();
                        const otherNode = allNodes.find(n => 
                          String(n.id || '').toLowerCase().trim() === otherKeyLower || 
                          String(n.label || '').toLowerCase().trim() === otherKeyLower
                        );
                        return (
                          <span
                            key={i}
                            style={{
                              fontSize: '11px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              color: '#cbd5e1'
                            }}
                          >
                            <strong style={{ color: '#a5b4fc' }}>{l.label}:</strong> {otherNode ? otherNode.label : otherKey}
                          </span>
                        );
                      })}
                      {connections.length > 5 && (
                        <span style={{ fontSize: '11px', color: '#94a3b8', padding: '2px 4px' }}>
                          +{connections.length - 5} más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Footer */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      if (onSendMessage) {
                        onSendMessage(`[ESCRIBA Engine] Consulta sobre la entidad ${entity.label} (${entity.type}): `);
                        onNavigate('chat');
                      }
                    }}
                    style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    Consultar en Chat
                  </button>

                  {entity.type === 'character' && (
                    <button
                      onClick={() => onNavigate('escriba_ensemble')}
                      style={{ padding: '7px 12px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#a5b4fc', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      title="Debatir con este personaje en el Ensamble Multi-Modelo"
                    >
                      Debatir
                    </button>
                  )}

                  <button
                    onClick={() => onNavigate('escriba_graph')}
                    style={{ padding: '7px 12px', background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.35)', color: '#6ee7b7', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    title="Inspeccionar en el grafo semántico 2D interactivo"
                  >
                    Grafo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: LABORATORIO DE ARQUITECTURA DE PERSONAJES Y TROPOS ───────── */}
      {showLabModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ background: '#090d16', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '16px', width: '1280px', maxWidth: '96vw', height: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
            
            {/* Header del Laboratorio */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.25)', color: '#e9d5ff', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Taller de Arquitectura Literaria
                  </span>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                    Laboratorio de Protagonistas, Antagonistas &amp; Tropos
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Forja personajes multidimensionales, deconstruye tropos para evitar clichés y calibra la tensión dialéctica de tu historia.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Selector de Modo: Díada vs Individual */}
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button
                    type="button"
                    onClick={() => setLabMode('tandem')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: labMode === 'tandem' ? 'rgba(168, 85, 247, 0.4)' : 'transparent',
                      color: labMode === 'tandem' ? '#ffffff' : '#94a3b8',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Forjar Díada (Tándem)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLabMode('individual')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: labMode === 'individual' ? 'rgba(99, 102, 241, 0.4)' : 'transparent',
                      color: labMode === 'individual' ? '#ffffff' : '#94a3b8',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Personaje Individual
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', fontWeight: 700, cursor: 'pointer', padding: '4px 8px' }}
                >
                  X
                </button>
              </div>
            </div>

            {/* Contenido Central: Doble Columna + Nexus Dialéctico */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Eje Dialéctico / Dilema Temático Central (en modo tándem) */}
              {labMode === 'tandem' && (
                <div style={{ background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.12) 50%, rgba(236, 72, 153, 0.08) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#e9d5ff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Eje Dialéctico y Dilema Temático (El choque moral sobre el que colisionan)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleAuditTension}
                        disabled={isAuditing}
                        style={{ padding: '4px 12px', background: 'rgba(168, 85, 247, 0.25)', border: '1px solid rgba(168, 85, 247, 0.5)', color: '#e9d5ff', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: isAuditing ? 'not-allowed' : 'pointer' }}
                      >
                        {isAuditing ? 'Auditando...' : 'Auditar Tensión & Clichés con IA'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateDebate}
                        disabled={isSimulatingDebate}
                        style={{ padding: '4px 12px', background: 'rgba(59, 130, 246, 0.25)', border: '1px solid rgba(59, 130, 246, 0.5)', color: '#93c5fd', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: isSimulatingDebate ? 'not-allowed' : 'pointer' }}
                      >
                        {isSimulatingDebate ? 'Simulando...' : 'Simular Choque Dialéctico en Vivo'}
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={labDilemma}
                    onChange={(e) => setLabDilemma(e.target.value)}
                    placeholder="ej. ¿Es justificable quebrar la moral y usar tiranía para evitar la extinción de una nación?"
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                  />

                  {/* Resultados de la Auditoría */}
                  {auditResult && (
                    <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#f3e8ff' }}>Dictamen de Tensión Temática: {auditResult.tension_score}/100</span>
                        <span style={{ fontSize: '11px', color: auditResult.tension_score > 75 ? '#6ee7b7' : '#fcd34d', fontWeight: 700 }}>
                          {auditResult.tension_score > 75 ? 'Polaridad Fuerte y Orgánica' : 'Tensión Moderada — Requiere Afilado'}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {auditResult.thematic_resonance}
                      </p>
                      {auditResult.cliche_risks && auditResult.cliche_risks.length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#f87171' }}>Riesgos de Cliché Detectados:</span>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '11.5px', color: '#fca5a5' }}>
                            {auditResult.cliche_risks.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      {auditResult.recommendations && auditResult.recommendations.length > 0 && (
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6ee7b7' }}>Recomendaciones Quirúrgicas de Enriquecimiento:</span>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '11.5px', color: '#a7f3d0' }}>
                            {auditResult.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resultados de la Simulación Dialéctica */}
                  {simulatedDebate && (
                    <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#93c5fd' }}>Simulación Dialéctica en Vivo:</span>
                        <button onClick={() => setSimulatedDebate('')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>Cerrar</button>
                      </div>
                      <div style={{ fontSize: '12.5px', color: '#e2e8f0', lineHeight: 1.6, maxHeight: '220px', overflowY: 'auto' }}>
                        <EscribaMarkdownRenderer content={simulatedDebate} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sugerencias de Enriquecimiento IA (Banner Interactivo) */}
              {suggestedOptions && suggestedOptions.length > 0 && (
                <div style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#e9d5ff' }}>
                      Propuestas de Deconstrucción &amp; Subversión para {suggestingTarget === 'protagonist' ? 'el Protagonista' : 'el Antagonista'}:
                    </span>
                    <button onClick={() => setSuggestedOptions([])} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer' }}>Cerrar</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                    {suggestedOptions.map((sug, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>{sug.title}</span>
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.3)', color: '#d8b4fe', fontWeight: 700 }}>
                            {sug.treatment}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#cbd5e1', lineHeight: 1.4 }}>
                          {sug.manifestation}
                        </p>
                        <div style={{ fontSize: '11px', color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '6px', borderRadius: '4px' }}>
                          <strong>Giro Anti-Cliché:</strong> {sug.twist}
                        </div>
                        <button
                          type="button"
                          onClick={() => applyTropeSuggestion(sug)}
                          style={{ marginTop: 'auto', padding: '5px 10px', background: '#6366f1', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Aplicar este Tratamiento
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Columnas de Caracterización (Split Screen en tándem o Centrada en individual) */}
              <div style={{ display: 'grid', gridTemplateColumns: labMode === 'tandem' ? '1fr 1fr' : '1fr', gap: '20px', maxWidth: labMode === 'individual' ? '760px' : 'none', margin: labMode === 'individual' ? '0 auto' : '0', width: '100%' }}>
                
                {/* ── COLUMNA: PROTAGONISTA ────────────────────────────── */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(99, 102, 241, 0.2)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#818cf8' }} />
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#c7d2fe' }}>
                        {labMode === 'tandem' ? 'Fuerza Protagónica' : 'Personaje Principal'}
                      </h3>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Eje Heroico / Catalizador</span>
                  </div>

                  {/* Nombre y Rol */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Nombre del Personaje:</label>
                      <input
                        type="text"
                        value={labProtagonist.name}
                        onChange={(e) => setLabProtagonist({ ...labProtagonist, name: e.target.value })}
                        placeholder="ej. Ryan, Elena, Damián..."
                        style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Rol Dramático:</label>
                      <select
                        value={labProtagonist.role}
                        onChange={(e) => setLabProtagonist({ ...labProtagonist, role: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      >
                        <option value="Protagonista">Protagonista</option>
                        <option value="Deuteragonista">Deuteragonista</option>
                        <option value="Antihéroe">Antihéroe</option>
                        <option value="Catalizador">Catalizador</option>
                      </select>
                    </div>
                  </div>

                  {/* Módulo de Tropo y Enriquecimiento */}
                  <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                        Tropo Literario &amp; Deconstrucción
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSuggestTrope('protagonist')}
                        disabled={isSuggesting}
                        style={{ padding: '3px 8px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.5)', color: '#c7d2fe', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: isSuggesting ? 'not-allowed' : 'pointer' }}
                      >
                        {isSuggesting && suggestingTarget === 'protagonist' ? 'Pensando...' : 'Sugerir Giros con IA'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Tropo Base:</label>
                        <select
                          value={labProtagonist.trope}
                          onChange={(e) => setLabProtagonist({ ...labProtagonist, trope: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        >
                          {TROPE_PRESETS.map(t => (
                            <option key={t.id} value={t.name}>{t.name} ({t.role})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Tratamiento:</label>
                        <select
                          value={labProtagonist.treatment}
                          onChange={(e) => setLabProtagonist({ ...labProtagonist, treatment: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        >
                          <option value="Clásico">Clásico</option>
                          <option value="Subvertido">Subvertido</option>
                          <option value="Deconstruido">Deconstruido</option>
                          <option value="Híbrido">Híbrido</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Manifestación Única en tu Universo:</label>
                      <textarea
                        rows="2"
                        value={labProtagonist.manifestation}
                        onChange={(e) => setLabProtagonist({ ...labProtagonist, manifestation: e.target.value })}
                        placeholder="¿Cómo se traduce este tropo a las reglas y atmósfera de tu historia?..."
                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Ancla Anti-Cliché / Giro de Ruptura:</label>
                      <input
                        type="text"
                        value={labProtagonist.twist}
                        onChange={(e) => setLabProtagonist({ ...labProtagonist, twist: e.target.value })}
                        placeholder="El detalle o contradicción íntima que rompe la previsibilidad..."
                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Psicología Profunda */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Núcleo Psicológico (Motor Interno)</span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Deseo Consciente (Querer):</label>
                        <input
                          type="text"
                          value={labProtagonist.desire}
                          onChange={(e) => setLabProtagonist({ ...labProtagonist, desire: e.target.value })}
                          placeholder="Meta tangible externa..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Necesidad Interna (Espíritu):</label>
                        <input
                          type="text"
                          value={labProtagonist.need}
                          onChange={(e) => setLabProtagonist({ ...labProtagonist, need: e.target.value })}
                          placeholder="La lección que debe aprender..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>La Herida Pasada / Trauma (Ghost):</label>
                      <input
                        type="text"
                        value={labProtagonist.wound}
                        onChange={(e) => setLabProtagonist({ ...labProtagonist, wound: e.target.value })}
                        placeholder="El acontecimiento del pasado que condiciona sus miedos..."
                        style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>La Mentira que Cree:</label>
                        <input
                          type="text"
                          value={labProtagonist.lie}
                          onChange={(e) => setLabProtagonist({ ...labProtagonist, lie: e.target.value })}
                          placeholder="ej. 'No puedo confiar en nadie'..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#f87171', marginBottom: '2px' }}>Falla Fatal (Hamartia):</label>
                        <input
                          type="text"
                          value={labProtagonist.fatal_flaw}
                          onChange={(e) => setLabProtagonist({ ...labProtagonist, fatal_flaw: e.target.value })}
                          placeholder="Su mayor defecto moral..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── COLUMNA: ANTAGONISTA (en modo tándem) ─────────────── */}
                {labMode === 'tandem' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(236, 72, 153, 0.2)', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f472b6' }} />
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fbcfe8' }}>
                          Fuerza Antagónica (La Sombra)
                        </h3>
                      </div>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Oposición Moral / Muro Temático</span>
                    </div>

                    {/* Nombre y Rol */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Nombre del Antagonista:</label>
                        <input
                          type="text"
                          value={labAntagonist.name}
                          onChange={(e) => setLabAntagonist({ ...labAntagonist, name: e.target.value })}
                          placeholder="ej. Comandante Ryan, Coronel Voron, La Inquisición..."
                          style={{ width: '100%', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Rol Antagónico:</label>
                        <select
                          value={labAntagonist.role}
                          onChange={(e) => setLabAntagonist({ ...labAntagonist, role: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        >
                          <option value="Antagonista">Antagonista Principal</option>
                          <option value="La Sombra">La Sombra del Héroe</option>
                          <option value="Rival Temático">Rival Temático</option>
                          <option value="Fuerza del Sistema">Fuerza del Sistema</option>
                        </select>
                      </div>
                    </div>

                    {/* Módulo de Tropo y Enriquecimiento */}
                    <div style={{ background: 'rgba(236, 72, 153, 0.05)', border: '1px solid rgba(236, 72, 153, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#f472b6', textTransform: 'uppercase' }}>
                          Tropo Antagónico &amp; Justificación
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSuggestTrope('antagonist')}
                          disabled={isSuggesting}
                          style={{ padding: '3px 8px', background: 'rgba(236, 72, 153, 0.2)', border: '1px solid rgba(236, 72, 153, 0.5)', color: '#fbcfe8', borderRadius: '4px', fontSize: '10px', fontWeight: 700, cursor: isSuggesting ? 'not-allowed' : 'pointer' }}
                        >
                          {isSuggesting && suggestingTarget === 'antagonist' ? 'Pensando...' : 'Sugerir Giros con IA'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Tropo Base:</label>
                          <select
                            value={labAntagonist.trope}
                            onChange={(e) => setLabAntagonist({ ...labAntagonist, trope: e.target.value })}
                            style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                          >
                            {TROPE_PRESETS.map(t => (
                              <option key={t.id} value={t.name}>{t.name} ({t.role})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Tratamiento:</label>
                          <select
                            value={labAntagonist.treatment}
                            onChange={(e) => setLabAntagonist({ ...labAntagonist, treatment: e.target.value })}
                            style={{ width: '100%', padding: '7px 10px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                          >
                            <option value="Clásico">Clásico</option>
                            <option value="Subvertido">Subvertido</option>
                            <option value="Deconstruido">Deconstruido</option>
                            <option value="Híbrido">Híbrido</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Su Justificación Moral en el Universo:</label>
                        <textarea
                          rows="2"
                          value={labAntagonist.manifestation}
                          onChange={(e) => setLabAntagonist({ ...labAntagonist, manifestation: e.target.value })}
                          placeholder="¿Por qué este antagonista cree firmemente que sus actos son los correctos?..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Ancla Anti-Cliché / Grieta Interna:</label>
                        <input
                          type="text"
                          value={labAntagonist.twist}
                          onChange={(e) => setLabAntagonist({ ...labAntagonist, twist: e.target.value })}
                          placeholder="El rasgo íntimo o la contradicción que le impide ser un villano plano..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    {/* Psicología Profunda Antagónica */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Núcleo Psicológico (La Razón de su Guerra)</span>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Agenda Explícita:</label>
                          <input
                            type="text"
                            value={labAntagonist.desire}
                            onChange={(e) => setLabAntagonist({ ...labAntagonist, desire: e.target.value })}
                            placeholder="Su plan u objetivo militar/político..."
                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Necesidad Oculta / Vacío:</label>
                          <input
                            type="text"
                            value={labAntagonist.need}
                            onChange={(e) => setLabAntagonist({ ...labAntagonist, need: e.target.value })}
                            placeholder="Lo que intenta compensar o silenciar..."
                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>El Trauma / Hecho que lo Corrompió:</label>
                        <input
                          type="text"
                          value={labAntagonist.wound}
                          onChange={(e) => setLabAntagonist({ ...labAntagonist, wound: e.target.value })}
                          placeholder="La traición o masacre que destruyó su empatía original..."
                          style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Dogma Intransigente:</label>
                          <input
                            type="text"
                            value={labAntagonist.lie}
                            onChange={(e) => setLabAntagonist({ ...labAntagonist, lie: e.target.value })}
                            placeholder="ej. 'La paz solo existe bajo el yugo'..."
                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#f87171', marginBottom: '2px' }}>Punto Ciego / Falla:</label>
                          <input
                            type="text"
                            value={labAntagonist.fatal_flaw}
                            onChange={(e) => setLabAntagonist({ ...labAntagonist, fatal_flaw: e.target.value })}
                            placeholder="La ceguera o arrogancia que causará su caída..."
                            style={{ width: '100%', padding: '7px 10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer de Acciones del Laboratorio */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Al inyectar, los personajes se guardan en el Catálogo, se conectan con Polaridad Dramática en el Grafo y se sincronizan al RAG.
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveLaboratory}
                  disabled={isSavingLab}
                  style={{
                    padding: '8px 24px',
                    background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isSavingLab ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(147, 51, 234, 0.4)'
                  }}
                >
                  {isSavingLab ? 'Inyectando Arquitectura...' : 'Inyectar al Universo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal CRUD Estándar */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '20px' }}>
          <form onSubmit={handleSaveNode} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '14px', padding: '26px', width: '500px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 700 }}>
              {editingNode ? `Editar ${currentCategory.label.slice(0, -1)}` : `Nuevo ${currentCategory.label.slice(0, -1)}`}
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Nombre / Denominación:</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ej. Nombre de la persona, facción, lugar o acontecimiento..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Categoría:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Estado:</label>
                <select
                  value={attrStatus}
                  onChange={(e) => setAttrStatus(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                >
                  <option value="Activo">Activo</option>
                  <option value="Histórico">Histórico</option>
                  <option value="Fallecido">Fallecido / Concluido</option>
                  <option value="Latente">Latente</option>
                  <option value="Mártir">Mártir / Símbolo</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Rol o Arquetipo Principal:</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="ej. Protagonista, General Rebelde, Bastión Fortificado..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Descripción y Contexto Narrativo:</label>
              <textarea
                rows="3"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Resumen del peso histórico o literario, antecedentes..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                {type === 'character' ? 'Psicología y Temperamento:' : type === 'faction' ? 'Ideología y Principios:' : type === 'location' ? 'Atmósfera Sensorial:' : 'Detonante o Causa:'}
              </label>
              <input
                type="text"
                value={attrPersonality}
                onChange={(e) => setAttrPersonality(e.target.value)}
                placeholder="Atributo psicológico, doctrinario o sensorial..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                {type === 'character' ? 'Motivaciones Nucleares:' : type === 'faction' ? 'Objetivos Estratégicos:' : type === 'location' ? 'Importancia Estratégica:' : 'Consecuencias:'}
              </label>
              <input
                type="text"
                value={attrMotivations}
                onChange={(e) => setAttrMotivations(e.target.value)}
                placeholder="Metas fundamentales, tensiones o consecuencias..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                {type === 'character' ? 'Secretos o Vulnerabilidades:' : type === 'faction' ? 'Recursos y Apoyos:' : type === 'location' ? 'Facción que Controla:' : 'Impacto Histórico:'}
              </label>
              <input
                type="text"
                value={attrSecrets}
                onChange={(e) => setAttrSecrets(e.target.value)}
                placeholder="Secretos, recursos o dominio..."
                style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 20px', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                {editingNode ? 'Guardar Cambios' : 'Crear Entidad'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

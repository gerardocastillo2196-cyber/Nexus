import React, { useState, useEffect } from 'react';

const NODE_TYPES = [
  { id: 'character', label: 'Personaje', color: '#818cf8', icon: '' },
  { id: 'location', label: 'Lugar', color: '#34d399', icon: '' },
  { id: 'faction', label: 'Facción', color: '#f59e0b', icon: '' },
  { id: 'event', label: 'Evento', color: '#ef4444', icon: '' },
  { id: 'analysis_tool', label: 'Herramienta IA', color: '#a855f7', icon: '' }
];

export default function EscribaGraphView({ onNavigate, onSendMessage }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Form states
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeType, setNewNodeType] = useState('character');
  const [newNodeRole, setNewNodeRole] = useState('');
  const [newNodeContext, setNewNodeContext] = useState('');

  const [linkSource, setLinkSource] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkLabel, setLinkLabel] = useState('ALIANZA');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractFeedback, setExtractFeedback] = useState('');

  const handleAutoExtract = async () => {
    setIsExtracting(true);
    setExtractFeedback('Extrayendo entidades y relaciones del manuscrito con IA...');
    try {
      const res = await fetch('/api/escriba/graph/extract', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.graph) {
          setGraphData(data.graph);
        } else {
          await fetchGraph();
        }
        setExtractFeedback(data.message || 'Grafo extraído y sincronizado con éxito.');
        setTimeout(() => setExtractFeedback(''), 6000);
      } else {
        const err = await res.json().catch(() => ({}));
        setExtractFeedback('Aviso: ' + (err.detail || 'No se pudo extraer el grafo.'));
        setTimeout(() => setExtractFeedback(''), 5000);
      }
    } catch (err) {
      console.error('Error al auto-extraer grafo:', err);
      setExtractFeedback('Error de conexión al extraer el grafo.');
      setTimeout(() => setExtractFeedback(''), 4000);
    } finally {
      setIsExtracting(false);
    }
  };

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escriba/graph');
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (err) {
      console.error('Error cargando grafo ESCRIBA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleAddNode = async (e) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    try {
      const res = await fetch('/api/escriba/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newNodeLabel.trim(),
          type: newNodeType,
          attributes: {
            role: newNodeRole.trim(),
            context: newNodeContext.trim(),
            hierarchy: 1
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.graph) setGraphData(data.graph);
        else fetchGraph();
        setShowAddModal(false);
        setNewNodeLabel('');
        setNewNodeRole('');
        setNewNodeContext('');
      }
    } catch (err) {
      console.error('Error agregando nodo:', err);
    }
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkSource || !linkTarget) return;

    try {
      const res = await fetch('/api/escriba/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: linkSource,
          target: linkTarget,
          label: linkLabel.toUpperCase().trim() || 'RELACIÓN'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.graph) setGraphData(data.graph);
        else fetchGraph();
        setShowLinkModal(false);
      }
    } catch (err) {
      console.error('Error creando relación:', err);
    }
  };

  const handleDeleteNode = async (nodeId) => {
    if (!window.confirm('¿Deseas eliminar esta entidad del grafo?')) return;
    try {
      const res = await fetch(`/api/escriba/node/${nodeId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.graph) setGraphData(data.graph);
        else fetchGraph();
        if (selectedNode?.id === nodeId) setSelectedNode(null);
      }
    } catch (err) {
      console.error('Error eliminando nodo:', err);
    }
  };

  const filteredNodes = graphData.nodes.filter(n => {
    const matchesType = filterType === 'all' || n.type === filterType;
    const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (n.attributes?.context || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getNodeColor = (type) => {
    const found = NODE_TYPES.find(t => t.id === type);
    return found ? found.color : '#94a3b8';
  };

  // Posicionamiento de nodos para renderizado SVG interactivo
  const nodesWithPos = filteredNodes.map((node, index) => {
    const total = filteredNodes.length || 1;
    let radiusX = 290;
    let radiusY = 180;
    let angle = (index / total) * 2 * Math.PI;

    if (total > 10) {
      const isInner = index % 2 === 1;
      radiusX = isInner ? 170 : 310;
      radiusY = isInner ? 105 : 195;
      angle = (Math.floor(index / 2) / Math.ceil(total / 2)) * 2 * Math.PI + (isInner ? 0.35 : 0);
    }

    const centerX = 380;
    const centerY = 240;
    
    // Si tiene coordenadas personalizadas
    const x = node.x && node.x !== 0 ? Math.min(Math.max(node.x, 60), 700) : centerX + radiusX * Math.cos(angle);
    const y = node.y && node.y !== 0 ? Math.min(Math.max(node.y, 60), 420) : centerY + radiusY * Math.sin(angle);
    
    return { ...node, px: x, py: y };
  });

  // Relaciones visibles (resolviendo por ID o por etiqueta de texto)
  const visibleLinks = (graphData.links || []).filter(link => {
    const sStr = String(link.source || '').toLowerCase().trim();
    const tStr = String(link.target || '').toLowerCase().trim();
    const sourceExists = nodesWithPos.some(n => n.id.toLowerCase() === sStr || n.label.toLowerCase() === sStr);
    const targetExists = nodesWithPos.some(n => n.id.toLowerCase() === tStr || n.label.toLowerCase() === tStr);
    return sourceExists && targetExists;
  });

  return (
    <div className="view-container escriba-graph-container" style={{ padding: '24px', color: '#f8fafc', height: '100%', overflowY: 'auto' }}>
      {/* Dynamic Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ESCRIBA — Grafo Narrativo Semántico
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Visualización interactiva de nodos, alianzas, facciones y estructura de universo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="action-btn secondary-btn"
            onClick={() => setShowLinkModal(true)}
            style={{ padding: '8px 14px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
          >
            + Nueva Relación
          </button>
          <button 
            className="action-btn primary-btn"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', borderRadius: '6px', background: '#6366f1', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            + Nueva Entidad
          </button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <input
          type="text"
          placeholder="Buscar entidad o contexto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', padding: '8px 12px', color: '#fff' }}
        />
        
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setFilterType('all')}
            style={{
              padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
              background: filterType === 'all' ? '#6366f1' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#fff'
            }}
          >
            Todos ({graphData.nodes.length})
          </button>
          {NODE_TYPES.map(type => {
            const count = graphData.nodes.filter(n => n.type === type.id).length;
            return (
              <button
                key={type.id}
                onClick={() => setFilterType(type.id)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                  background: filterType === type.id ? type.color : 'rgba(255,255,255,0.05)',
                  border: filterType === type.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <span>{type.icon}</span>
                <span>{type.label} ({count})</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={async () => {
            const selIds = graphData.nodes.slice(0, 3).map(n => n.id);
            try {
              const res = await fetch('/api/escriba/nexus');
              const data = await res.json();
              alert(`Nexo Analítico (Intersección Topológica):\nSe encontraron ${data.count} entidades compartidas en el cruce de los lentes seleccionados.`);
            } catch (err) {
              console.error('Error calculando nexo:', err);
            }
          }}
          style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#d8b4fe', cursor: 'pointer', fontWeight: 600 }}
        >
          Nexo Analítico (0 Tokens)
        </button>

        <button
          onClick={handleAutoExtract}
          disabled={isExtracting}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            background: isExtracting ? 'rgba(52, 211, 153, 0.1)' : 'rgba(52, 211, 153, 0.2)',
            border: '1px solid #34d399',
            color: '#6ee7b7',
            cursor: isExtracting ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Analiza todos los capítulos del manuscrito con IA y puebla automáticamente los nodos y relaciones del grafo"
        >
          {isExtracting ? 'Extrayendo Grafo con IA...' : 'Auto-Extraer Grafo desde Manuscrito'}
        </button>

        {extractFeedback && (
          <span style={{ fontSize: '11px', color: extractFeedback.startsWith('Aviso') ? '#fbbf24' : '#6ee7b7', fontWeight: 600, padding: '4px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
            {extractFeedback}
          </span>
        )}
      </div>

      {/* Main Graph Grid & Inspector Split */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 340px' : '1fr', gap: '18px' }}>
        
        {/* SVG Interactive Canvas */}
        <div style={{ background: '#0b1329', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px', position: 'relative', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
              Haz clic en cualquier nodo para inspeccionar relaciones o ejecutar simulación.
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '440px', color: '#94a3b8' }}>
              Cargando grafo semántico de ESCRIBA...
            </div>
          ) : nodesWithPos.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '440px', color: '#94a3b8' }}>
              <p>No se encontraron entidades con el filtro actual.</p>
              <button 
                onClick={() => { setFilterType('all'); setSearchQuery(''); }}
                style={{ padding: '6px 14px', background: '#6366f1', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <svg width="100%" height="460" viewBox="0 0 760 480" style={{ width: '100%', height: '460px' }}>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.4)" />
                </marker>
              </defs>

              {/* Links / Edges */}
              {visibleLinks.map((link) => {
                const sStr = String(link.source || '').toLowerCase().trim();
                const tStr = String(link.target || '').toLowerCase().trim();
                const srcNode = nodesWithPos.find(n => n.id.toLowerCase() === sStr || n.label.toLowerCase() === sStr);
                const tgtNode = nodesWithPos.find(n => n.id.toLowerCase() === tStr || n.label.toLowerCase() === tStr);
                if (!srcNode || !tgtNode) return null;

                const midX = (srcNode.px + tgtNode.px) / 2;
                const midY = (srcNode.py + tgtNode.py) / 2;
                const isSelected = selectedNode && (selectedNode.id === srcNode.id || selectedNode.id === tgtNode.id);

                return (
                  <g key={link.id || `${link.source}-${link.target}`}>
                    <line
                      x1={srcNode.px}
                      y1={srcNode.py}
                      x2={tgtNode.px}
                      y2={tgtNode.py}
                      stroke={isSelected ? '#a5b4fc' : 'rgba(255,255,255,0.2)'}
                      strokeWidth={isSelected ? '2.5' : '1.5'}
                      strokeDasharray={link.label.includes('SECRETA') ? '4 4' : 'none'}
                      markerEnd="url(#arrow)"
                    />
                    <rect
                      x={midX - 35}
                      y={midY - 10}
                      width="70"
                      height="18"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.85)"
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <text
                      x={midX}
                      y={midY + 2}
                      textAnchor="middle"
                      fill={isSelected ? '#a5b4fc' : '#94a3b8'}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {link.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {nodesWithPos.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const nodeColor = getNodeColor(node.type);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.px}, ${node.py})`}
                    onClick={() => setSelectedNode(node)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Node Aura if selected */}
                    {isSelected && (
                      <circle r="28" fill="none" stroke={nodeColor} strokeWidth="3" strokeDasharray="3 3" opacity="0.8" />
                    )}
                    {/* Node Base */}
                    <circle
                      r="20"
                      fill="#0f172a"
                      stroke={nodeColor}
                      strokeWidth="2.5"
                    />
                    <text textAnchor="middle" y="4" fontSize="11" fontWeight="700" fill="#ffffff">
                      {node.label ? node.label.charAt(0).toUpperCase() : '•'}
                    </text>
                    {/* Label */}
                    <rect
                      x="-60"
                      y="26"
                      width="120"
                      height="20"
                      rx="4"
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={isSelected ? nodeColor : 'rgba(255,255,255,0.15)'}
                    />
                    <text
                      x="0"
                      y="39"
                      textAnchor="middle"
                      fill="#fff"
                      fontSize="11"
                      fontWeight={isSelected ? "700" : "500"}
                    >
                      {node.label.length > 16 ? node.label.substring(0, 14) + '...' : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', tracking: '1px', color: getNodeColor(selectedNode.type), fontWeight: 700 }}>
                  {NODE_TYPES.find(t => t.id === selectedNode.type)?.label || selectedNode.type}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#fff' }}>{selectedNode.label}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {selectedNode.attributes?.role && (
              <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '6px', borderLeft: `3px solid ${getNodeColor(selectedNode.type)}` }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Rol o Jerarquía:</span>
                <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>{selectedNode.attributes.role}</span>
              </div>
            )}

            <div>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Contexto Narrativo:</span>
              <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
                {selectedNode.attributes?.context || 'Sin descripción contextual especificada.'}
              </p>
            </div>

            {/* Direct Connections */}
            <div>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Relaciones Directas:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                {graphData.links
                  .filter(l => {
                    const s = String(l.source || '').toLowerCase().trim();
                    const t = String(l.target || '').toLowerCase().trim();
                    const nid = String(selectedNode.id || '').toLowerCase().trim();
                    const nlab = String(selectedNode.label || '').toLowerCase().trim();
                    return s === nid || s === nlab || t === nid || t === nlab;
                  })
                  .map(l => {
                    const s = String(l.source || '').toLowerCase().trim();
                    const nid = String(selectedNode.id || '').toLowerCase().trim();
                    const nlab = String(selectedNode.label || '').toLowerCase().trim();
                    const otherKey = (s === nid || s === nlab) ? l.target : l.source;
                    const otherKeyLower = String(otherKey || '').toLowerCase().trim();
                    const otherNode = graphData.nodes.find(n => 
                      String(n.id || '').toLowerCase().trim() === otherKeyLower || 
                      String(n.label || '').toLowerCase().trim() === otherKeyLower
                    );
                    return (
                      <div key={l.id || `${l.source}-${l.target}-${l.label}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
                        <span style={{ color: '#a5b4fc', fontWeight: 600 }}>{l.label}</span>
                        <span style={{ color: '#fff' }}>{otherNode ? otherNode.label : otherKey}</span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  if (onSendMessage) {
                    onSendMessage(`[ESCRIBA Engine — Simulación Dominó] Ejecuta un análisis de impacto y ruptura de alianzas para la entidad: '${selectedNode.label}'`);
                    onNavigate('chat');
                  }
                }}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid #6366f1', color: '#a5b4fc', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
              >
                Simular Efecto Dominó con IA
              </button>

              <button
                onClick={() => handleDeleteNode(selectedNode.id)}
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Eliminar del Grafo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Agregar Nodo */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <form onSubmit={handleAddNode} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>Agregar Entidad al Grafo</h3>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nombre o Título:</label>
              <input
                type="text"
                required
                value={newNodeLabel}
                onChange={(e) => setNewNodeLabel(e.target.value)}
                placeholder="ej. Valerius Vane, Ciudadela..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tipo de Entidad:</label>
              <select
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                {NODE_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Rol o Jerarquía:</label>
              <input
                type="text"
                value={newNodeRole}
                onChange={(e) => setNewNodeRole(e.target.value)}
                placeholder="ej. General del Sur, Fortaleza..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Contexto / Descripción:</label>
              <textarea
                rows="3"
                value={newNodeContext}
                onChange={(e) => setNewNodeContext(e.target.value)}
                placeholder="Descripción detallada de la entidad..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Guardar Entidad
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Agregar Relación */}
      {showLinkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <form onSubmit={handleAddLink} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '24px', width: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>Crear Nueva Relación Semántica</h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Entidad Origen:</label>
              <select
                required
                value={linkSource}
                onChange={(e) => setLinkSource(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="">-- Seleccionar Origen --</option>
                {graphData.nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Etiqueta de Relación:</label>
              <input
                type="text"
                required
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
                placeholder="ej. ALIANZA_SECRETA, ENEMIGO, LIDERIZA..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Entidad Destino:</label>
              <select
                required
                value={linkTarget}
                onChange={(e) => setLinkTarget(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                <option value="">-- Seleccionar Destino --</option>
                {graphData.nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Crear Relación
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

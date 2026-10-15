import React, { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'character', label: 'Personajes', color: '#818cf8' },
  { id: 'location', label: 'Lugares', color: '#34d399' },
  { id: 'faction', label: 'Facciones', color: '#f59e0b' },
  { id: 'event', label: 'Eventos', color: '#ef4444' }
];

export default function EscribaEntitiesView({ onNavigate, onSendMessage }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [activeTab, setActiveTab] = useState('character');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  
  const [label, setLabel] = useState('');
  const [type, setType] = useState('character');
  const [role, setRole] = useState('');
  const [context, setContext] = useState('');

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escriba/graph');
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
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

  const openCreateModal = (categoryType = activeTab) => {
    setEditingNode(null);
    setLabel('');
    setType(categoryType);
    setRole('');
    setContext('');
    setShowModal(true);
  };

  const openEditModal = (node) => {
    setEditingNode(node);
    setLabel(node.label);
    setType(node.type);
    setRole(node.attributes?.role || '');
    setContext(node.attributes?.context || '');
    setShowModal(true);
  };

  const handleDelete = async (nodeId) => {
    if (!window.confirm('¿Confirmas que deseas eliminar esta entidad?')) return;

    try {
      const res = await fetch(`/api/escriba/node/${nodeId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.graph) setGraphData(data.graph);
        else fetchGraph();
      }
    } catch (err) {
      console.error('Error al eliminar entidad:', err);
    }
  };

  const handleSaveNode = async (e) => {
    e.preventDefault();
    if (!label.trim()) return;

    try {
      const res = await fetch('/api/escriba/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNode ? editingNode.id : undefined,
          label: label.trim(),
          type: type,
          attributes: {
            role: role.trim(),
            context: context.trim()
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.graph) setGraphData(data.graph);
        else fetchGraph();
        setShowModal(false);
      }
    } catch (err) {
      console.error('Error guardando entidad:', err);
    }
  };

  const currentCategory = CATEGORIES.find(c => c.id === activeTab);
  const filteredNodes = graphData.nodes.filter(n => 
    n.type === activeTab && 
    (n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
     (n.attributes?.role && n.attributes.role.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="view-container escriba-entities-container" style={{ padding: '24px', color: '#f8fafc', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ESCRIBA — Administración de Personajes, Lugares y Facciones
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Catálogo completo de entidades con descripciones, roles, alineación y conexiones directas.
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          style={{ padding: '9px 18px', borderRadius: '6px', background: '#6366f1', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          + Agregar {currentCategory?.label.slice(0, -1)}
        </button>
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
        {CATEGORIES.map(cat => {
          const count = graphData.nodes.filter(n => n.type === cat.id).length;
          const isActive = activeTab === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                padding: '10px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                color: isActive ? cat.color : '#94a3b8',
                fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? `2px solid ${cat.color}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'
              }}
            >
              <span>{cat.label}</span>
              <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Stats Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Buscar en ${currentCategory?.label}...`}
          style={{ padding: '8px 14px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', width: '280px', fontSize: '13px' }}
        />
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Mostrando {filteredNodes.length} de {graphData.nodes.filter(n => n.type === activeTab).length} registros
        </span>
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Cargando catálogo...
        </div>
      ) : filteredNodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px border-dashed rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#94a3b8', marginBottom: '12px' }}>No hay {currentCategory?.label.toLowerCase()} registrados en este proyecto.</p>
          <button
            onClick={() => openCreateModal()}
            style={{ padding: '8px 16px', background: '#6366f1', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            + Crear Primer {currentCategory?.label.slice(0, -1)}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
          {filteredNodes.map(entity => {
            const connections = graphData.links.filter(l => l.source === entity.id || l.target === entity.id);

            return (
              <div
                key={entity.id}
                style={{
                  background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '18px',
                  display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', transition: 'border-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{entity.label}</h3>
                      {entity.attributes?.role && (
                        <span style={{ fontSize: '12px', color: currentCategory?.color, fontWeight: 600 }}>
                          {entity.attributes.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => openEditModal(entity)}
                      title="Editar"
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(entity.id)}
                      title="Eliminar"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#fca5a5', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', minHeight: '52px' }}>
                  {entity.attributes?.context || 'Sin descripción detallada.'}
                </p>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', pt: '8px' }}>
                  <button
                    onClick={() => {
                      if (onSendMessage) {
                        onSendMessage(`[ESCRIBA Engine] Consulta sobre la entidad ${entity.label} (${entity.type}): `);
                        onNavigate('chat');
                      }
                    }}
                    style={{ width: '100%', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Consultar en Chat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD Entidad */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <form onSubmit={handleSaveNode} style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '24px', width: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>
              {editingNode ? `Editar ${currentCategory?.label.slice(0, -1)}` : `Nuevo ${currentCategory?.label.slice(0, -1)}`}
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nombre / Título:</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="ej. Nombre del personaje, lugar o facción..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Categoría:</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Rol / Cargo / Atributo Principal:</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="ej. Líder, Santuario principal, Baluarte defensivo..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Descripción Contextual:</label>
              <textarea
                rows="4"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Historia, significancia narrativa, contexto del mundo..."
                style={{ width: '100%', padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: '#6366f1', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                {editingNode ? 'Actualizar Entidad' : 'Crear Entidad'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

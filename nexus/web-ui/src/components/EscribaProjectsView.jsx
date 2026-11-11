import React, { useState, useEffect } from 'react';

export default function EscribaProjectsView({ onNavigate, onProjectChange }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const DEFAULT_GENRES = [
    "Fantasía Épica / Alta Fantasía",
    "Fantasía Oscura / Grimdark",
    "Ciencia Ficción / Cyberpunk",
    "Ciencia Ficción / Space Opera",
    "Thriller / Suspenso Psicológico",
    "Novela Negra / Policial & Detective",
    "Ficción Histórica / Épica Militar",
    "Realismo Mágico",
    "Drama / Ficción Contemporánea",
    "Ensayo / Crónica Documental",
    "Terror / Horror Cósmico",
    "Filosofía / Ensayo Especulativo",
  ];

  const DEFAULT_TONES = [
    "Solemne, Inmersivo y Detallado",
    "Intimista y Primera Persona",
    "Dramático y Tenso",
    "Oscuro, Crudo y Sombrío",
    "Épico y Heroico",
    "Analítico, Frío y Documental",
    "Poético y Filosófico",
    "Satírico y Humoresco",
  ];

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genreOptions, setGenreOptions] = useState(DEFAULT_GENRES);
  const [toneOptions, setToneOptions] = useState(DEFAULT_TONES);
  const [genre, setGenre] = useState(DEFAULT_GENRES[0]);
  const [tone, setTone] = useState(DEFAULT_TONES[0]);

  const fetchOptions = async () => {
    try {
      const res = await fetch('/api/escriba/options');
      if (res.ok) {
        const data = await res.json();
        if (data.genres && data.genres.length > 0) setGenreOptions(data.genres);
        if (data.tones && data.tones.length > 0) setToneOptions(data.tones);
      }
    } catch (err) {
      console.error('Error cargando opciones de ESCRIBA:', err);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/escriba/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error cargando proyectos de ESCRIBA:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchProjects();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const res = await fetch('/api/escriba/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          genre: genre,
          tone: tone
        })
      });

      if (res.ok) {
        await fetchProjects();
        setShowModal(false);
        setName('');
        setDescription('');
        if (onProjectChange) {
          await onProjectChange();
        }
      }
    } catch (err) {
      console.error('Error creando proyecto:', err);
    }
  };

  const handleSwitchProject = async (projectId, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/escriba/projects/switch?project_id=${projectId}`, { method: 'POST' });
      if (res.ok) {
        await fetchProjects();
        if (onProjectChange) {
          await onProjectChange();
        }
      }
    } catch (err) {
      console.error('Error cambiando de proyecto:', err);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/escriba/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setDeletingId(null);
        if (data.projects !== undefined) {
          setProjects(data.projects);
        } else {
          await fetchProjects();
        }
        if (onProjectChange) {
          await onProjectChange();
        }
      }
    } catch (err) {
      console.error('Error eliminando proyecto:', err);
    }
  };

  return (
    <div className="view-container escriba-projects-container" style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header Editorial Pro */}
      <div className="pro-view-header">
        <div>
          <h1 className="pro-view-title escriba-glow-text">
            ESCRIBA — Gestor de Proyectos Narrativos
          </h1>
          <p className="pro-view-subtitle">
            Crea, administra y orquesta universos, mitologías y manuscritos literarios.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="pro-btn pro-btn-amber pro-btn-lg"
        >
          <span>+ Crear Nuevo Proyecto</span>
        </button>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '14px' }}>
          Sincronizando biblioteca de proyectos narrativos...
        </div>
      ) : projects.length === 0 ? (
        <div
          className="pro-card"
          style={{
            textAlign: 'center',
            padding: '70px 24px',
            borderStyle: 'dashed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
            fontSize: '20px',
            fontWeight: 700
          }}>
            E
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: '#f1f5f9', fontWeight: 650 }}>
              No hay proyectos narrativos registrados
            </h3>
            <p style={{ margin: '6px 0 0 0', color: '#64748b', fontSize: '13px', maxWidth: '420px' }}>
              Para interactuar con el motor narrativo y redactar manuscritos, utiliza el botón superior "+ Crear Nuevo Proyecto".
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
          {projects.map((proj) => {
            const isActive = proj.active;
            const isDeleting = deletingId === proj.id;

            return (
              <div
                key={proj.id}
                className={`pro-card pro-card-interactive ${isActive ? 'pro-card-amber-active' : ''}`}
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                onClick={(e) => {
                  if (!isActive) handleSwitchProject(proj.id, e);
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="pro-badge pro-badge-indigo" style={{ marginBottom: '8px' }}>
                      <span className="pro-badge-dot" />
                      {proj.genre || 'Fantasía / Ficción'}
                    </span>
                    <h3 style={{
                      margin: 0,
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#ffffff',
                      letterSpacing: '-0.015em',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {proj.name}
                    </h3>
                  </div>

                  {isActive ? (
                    <span className="pro-badge pro-badge-amber">
                      <span className="pro-badge-dot" />
                      Activo
                    </span>
                  ) : (
                    <span className="pro-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.07)' }}>
                      Inactivo
                    </span>
                  )}
                </div>

                {/* Card Description */}
                <p style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  background: 'rgba(5, 7, 14, 0.5)',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  minHeight: '44px'
                }}>
                  {proj.description || 'Sin sinopsis o descripción registrada.'}
                </p>

                {/* Metadata Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: '#64748b',
                  paddingTop: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Tono:</span>
                    <strong style={{ color: '#cbd5e1', fontWeight: 600 }}>{proj.tone || 'Estándar'}</strong>
                  </div>
                  <span>{proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'Reciente'}</span>
                </div>

                {/* Card Actions */}
                <div
                  style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isActive ? (
                    <button
                      onClick={(e) => handleSwitchProject(proj.id, e)}
                      className="pro-btn pro-btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cargar Proyecto
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate?.('chat')}
                      className="pro-btn pro-btn-amber"
                      style={{ flex: 1 }}
                    >
                      Abrir Manuscrito
                    </button>
                  )}

                  {isDeleting ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#fb7185', fontWeight: 650 }}>¿Eliminar?</span>
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="pro-btn pro-btn-danger pro-btn-sm"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                        className="pro-btn pro-btn-ghost pro-btn-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingId(proj.id); }}
                      title="Eliminar Proyecto"
                      className="pro-btn pro-btn-danger pro-btn-sm"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Proyecto */}
      {showModal && (
        <div className="pro-modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="pro-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="pro-modal-header">
              <div>
                <h3 className="pro-modal-title">Nuevo Proyecto Narrativo</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8b95a5' }}>
                  Define los parámetros fundacionales de tu universo literario.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="pro-btn pro-btn-ghost pro-btn-sm"
                style={{ fontSize: '14px', lineHeight: 1 }}
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className="pro-modal-body">
                <div className="pro-field-group">
                  <label className="pro-field-label">Título del Proyecto / Novela:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej. Crónicas del Primer Imperio"
                    className="pro-input"
                    autoFocus
                  />
                </div>

                <div className="pro-field-group">
                  <label className="pro-field-label">Género Literario:</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="pro-select"
                  >
                    {genreOptions.map((g) => (
                      <option key={g} value={g} style={{ background: '#0e111e', color: '#f1f5f9' }}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pro-field-group">
                  <label className="pro-field-label">Tono Narrativo:</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="pro-select"
                  >
                    {toneOptions.map((t) => (
                      <option key={t} value={t} style={{ background: '#0e111e', color: '#f1f5f9' }}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pro-field-group">
                  <label className="pro-field-label">Sinopsis / Premisa del Conflicto:</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe el núcleo del conflicto dramático, el escenario principal y las fuerzas en oposición..."
                    className="pro-textarea"
                  />
                  <span className="pro-field-hint">
                    Esta premisa guiará las sugerencias de arcos narrativos y coherencia del motor.
                  </span>
                </div>
              </div>

              <div className="pro-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="pro-btn pro-btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="pro-btn pro-btn-amber"
                >
                  Crear e Inicializar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

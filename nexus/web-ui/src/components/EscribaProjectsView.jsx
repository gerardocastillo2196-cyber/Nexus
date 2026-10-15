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
    <div className="view-container escriba-projects-container" style={{ padding: '24px', color: 'var(--text-primary, #ffffff)', height: '100%', overflowY: 'auto', background: 'transparent' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', pb: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
              ESCRIBA — Gestor de Proyectos Narrativos
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
            Crear, cargar, administrar y eliminar universos y manuscritos narrativos.
          </p>
        </div>
      </div>

      {/* Grid of Projects */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted, #94a3b8)' }}>
          Cargando proyectos de ESCRIBA...
        </div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--surface-container, rgba(255,255,255,0.03))', borderRadius: '12px', border: '1px border-dashed var(--border-subtle, rgba(255,255,255,0.1))' }}>
          <p style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '14px' }}>No hay proyectos narrativos registrados.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 16px', background: 'var(--accent-blue, #6366f1)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
          >
            + Crear Primer Proyecto
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {projects.map((proj) => {
            const isActive = proj.active;
            const isDeleting = deletingId === proj.id;

            return (
              <div
                key={proj.id}
                style={{
                  background: isActive ? 'var(--bg-hover, rgba(99, 102, 241, 0.15))' : 'var(--surface-container, rgba(255,255,255,0.03))',
                  border: isActive ? '2px solid var(--border-focus, #6366f1)' : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                  borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--accent-blue, #818cf8)', fontWeight: 700 }}>
                      {proj.genre || 'Fantasía / Ficción'}
                    </span>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: 'var(--text-primary, #ffffff)' }}>{proj.name}</h3>
                  </div>
                  {isActive && (
                    <span style={{ fontSize: '11px', background: 'var(--border-focus, #6366f1)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      SELECCIONADO
                    </span>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.5, background: 'var(--bg-tertiary, rgba(0,0,0,0.15))', padding: '10px', borderRadius: '6px' }}>
                  {proj.description || 'Sin descripción especificada.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
                  <span>Tono: <strong style={{ color: 'var(--text-primary, #e2e8f0)' }}>{proj.tone || 'Normal'}</strong></span>
                  <span>Creado: {proj.createdAt ? new Date(proj.createdAt).toLocaleDateString() : 'Reciente'}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', pt: '8px' }}>
                  {!isActive ? (
                    <button
                      onClick={(e) => handleSwitchProject(proj.id, e)}
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-tertiary, rgba(99, 102, 241, 0.2))', border: '1px solid var(--border-focus, #6366f1)', color: 'var(--text-primary, #a5b4fc)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Cargar Proyecto
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('chat')}
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--accent-blue, #6366f1)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Abrir Manuscrito
                    </button>
                  )}

                  {isDeleting ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>¿Eliminar?</span>
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        style={{ padding: '6px 10px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                      >
                        Sí
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                        style={{ padding: '6px 8px', background: 'transparent', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', color: 'var(--text-muted, #94a3b8)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeletingId(proj.id); }}
                      title="Eliminar Proyecto"
                      style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Card para crear un nuevo proyecto */}
          <div
            onClick={() => setShowModal(true)}
            style={{
              background: 'var(--surface-container, rgba(255,255,255,0.03))',
              border: '2px dashed var(--border-focus, rgba(99, 102, 241, 0.4))',
              borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: '10px', minHeight: '200px', cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: '28px', color: 'var(--accent-blue, #818cf8)', fontWeight: 300 }}>+</span>
            <span style={{ color: 'var(--text-primary, #a5b4fc)', fontWeight: 600, fontSize: '14px' }}>Crear Nuevo Proyecto</span>
          </div>
        </div>
      )}

      {/* Modal: Crear Proyecto */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <form onSubmit={handleCreateProject} style={{ background: 'var(--surface-elevated, #0f172a)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))', borderRadius: '12px', padding: '24px', width: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary, #fff)' }}>Crear Proyecto Narrativo</h3>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>Nombre del Proyecto / Novela:</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Crónicas del Primer Imperio"
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-tertiary, rgba(255,255,255,0.05))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', borderRadius: '6px', color: 'var(--text-primary, #fff)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>Género Literario:</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-tertiary, #1e293b)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', borderRadius: '6px', color: 'var(--text-primary, #fff)', outline: 'none' }}
              >
                {genreOptions.map((g) => (
                  <option key={g} value={g} style={{ background: '#0f172a', color: '#fff' }}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>Tono Narrativo:</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-tertiary, #1e293b)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', borderRadius: '6px', color: 'var(--text-primary, #fff)', outline: 'none' }}
              >
                {toneOptions.map((t) => (
                  <option key={t} value={t} style={{ background: '#0f172a', color: '#fff' }}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted, #94a3b8)', marginBottom: '4px' }}>Sinopsis / Descripción Breve:</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sinopsis del mundo y conflicto principal..."
                style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-tertiary, rgba(255,255,255,0.05))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', borderRadius: '6px', color: 'var(--text-primary, #fff)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--border-subtle, rgba(255,255,255,0.2))', color: 'var(--text-primary, #fff)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '8px 16px', background: 'var(--accent-blue, #6366f1)', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Crear e Inicializar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

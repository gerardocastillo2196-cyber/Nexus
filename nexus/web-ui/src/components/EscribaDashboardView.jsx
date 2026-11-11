import React, { useState, useEffect } from 'react';

export default function EscribaDashboardView({ onNavigate }) {
  const [stats, setStats] = useState({
    totalWords: 0,
    readingTime: 0,
    chapterCount: 0,
    nodeCount: 0,
    linkCount: 0,
    completionPercentage: 0
  });
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasProject, setHasProject] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [graphRes, chapRes] = await Promise.all([
        fetch('/api/escriba/graph'),
        fetch('/api/escriba/chapters')
      ]);

      let nodeCount = 0;
      let linkCount = 0;
      let chapList = [];

      if (graphRes.ok) {
        const gData = await graphRes.json();
        nodeCount = gData.nodes?.length || 0;
        linkCount = gData.links?.length || 0;
      }

      if (chapRes.ok) {
        const cData = await chapRes.json();
        chapList = cData.chapters || [];
        setChapters(chapList);
      }

      const totalWords = chapList.reduce((acc, c) => acc + (c.wordCount || 0), 0);
      const readingTime = Math.ceil(totalWords / 200);
      const finishedCount = chapList.filter(c => c.status === 'Finalizado').length;
      const completionPercentage = chapList.length > 0 ? Math.round((finishedCount / chapList.length) * 100) : 0;

      setStats({
        totalWords,
        readingTime,
        chapterCount: chapList.length,
        nodeCount,
        linkCount,
        completionPercentage
      });
    } catch (err) {
      console.error('Error cargando tablero de trabajo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkProjects = async () => {
      try {
        const res = await fetch('/api/escriba/projects');
        if (res.ok) {
          const data = await res.json();
          const projs = data.projects || [];
          setHasProject(Boolean(projs.find(p => p.active)));
        }
      } catch (err) {
        setHasProject(false);
      }
    };
    checkProjects();
    fetchDashboardData();
  }, []);

  const handleToggleChapterStatus = async (e, chap) => {
    e.stopPropagation();
    const newStatus = chap.status === 'Finalizado' ? 'Borrador' : 'Finalizado';
    try {
      const res = await fetch('/api/escriba/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: chap.id,
          title: chap.title,
          content: chap.content || '',
          status: newStatus
        })
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Error actualizando estado del capítulo:', err);
    }
  };

  return (
    <div className="view-container escriba-dashboard-container" style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Header Pro */}
      <div className="pro-view-header">
        <div>
          <h1 className="pro-view-title escriba-glow-text">
            ESCRIBA — Tablero de Creación & Manuscrito
          </h1>
          <p className="pro-view-subtitle">
            Panel de control narrativo, métricas de lectura y gestión secuencial de capítulos.
          </p>
        </div>

        <button
          onClick={() => onNavigate?.('escriba_editor')}
          className="pro-btn pro-btn-amber"
        >
          <span>Abrir Canva de Redacción</span>
        </button>
      </div>

      {/* Metrics Cards Grid Pro */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', marginBottom: '32px' }}>
        
        <div className="pro-stat-card">
          <span className="pro-stat-label">Total de Palabras</span>
          <span className="pro-stat-number" style={{ color: '#fb923c' }}>{stats.totalWords.toLocaleString()}</span>
          <span className="pro-stat-sub">Palabras redactadas en el manuscrito</span>
        </div>

        <div className="pro-stat-card">
          <span className="pro-stat-label">Tiempo de Lectura</span>
          <span className="pro-stat-number" style={{ color: '#fbbf24' }}>~{stats.readingTime} min</span>
          <span className="pro-stat-sub">Ritmo estándar (200 pal/min)</span>
        </div>

        <div className="pro-stat-card">
          <span className="pro-stat-label">Capítulos Totales</span>
          <span className="pro-stat-number" style={{ color: '#34d399' }}>{stats.chapterCount}</span>
          <span className="pro-stat-sub">Capítulos estructurados</span>
        </div>

        <div className="pro-stat-card">
          <span className="pro-stat-label">Entidades en Grafo</span>
          <span className="pro-stat-number" style={{ color: '#818cf8' }}>{stats.nodeCount}</span>
          <span className="pro-stat-sub">{stats.linkCount} relaciones registradas</span>
        </div>

        <div className="pro-stat-card">
          <span className="pro-stat-label">Progreso Manuscrito</span>
          <span className="pro-stat-number" style={{ color: '#22d3ee' }}>{stats.completionPercentage}%</span>
          <span className="pro-stat-sub">Capítulos finalizados</span>
        </div>

      </div>

      {/* Chapter Breakdown Card Pro */}
      <div className="pro-card" style={{ padding: '26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
              Avances y Desglose por Capítulo
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#8b95a5' }}>
              Haz clic en cualquier capítulo para abrirlo en el Canva de Escritura o alternar su estado de revisión.
            </p>
          </div>
          <span className="pro-badge" style={{ background: 'rgba(255, 255, 255, 0.04)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {chapters.length} capítulos
          </span>
        </div>

        {chapters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748b' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#94a3b8' }}>No hay capítulos registrados en el proyecto activo.</p>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>Puedes redactar o solicitar capítulos en el chat de ESCRIBA para sincronizarlos con el Canva.</p>
            <button
              onClick={() => onNavigate?.('escriba_editor')}
              className="pro-btn pro-btn-amber"
            >
              Crear Primer Fragmento en Canva
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chapters.map((chap, idx) => (
              <div
                key={chap.id}
                onClick={() => onNavigate?.('escriba_editor')}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'rgba(8, 10, 18, 0.5)',
                  padding: '14px 18px', borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(8, 10, 18, 0.5)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    fontSize: '12px', color: '#fbbf24', fontWeight: 700,
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f8fafc' }}>{chap.title}</h4>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{chap.wordCount || 0} palabras • ~{Math.ceil((chap.wordCount || 0) / 200)} min de lectura</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Status Toggle Pill */}
                  <span
                    onClick={(e) => handleToggleChapterStatus(e, chap)}
                    title="Alternar entre Borrador y Finalizado"
                    className={`pro-badge ${chap.status === 'Finalizado' ? 'pro-badge-emerald' : 'pro-badge-amber'}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="pro-badge-dot" />
                    {chap.status === 'Finalizado' ? 'Finalizado' : 'Borrador'}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('escriba_editor');
                    }}
                    className="pro-btn pro-btn-secondary pro-btn-sm"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


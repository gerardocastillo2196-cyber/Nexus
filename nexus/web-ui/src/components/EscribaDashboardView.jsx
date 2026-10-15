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
  const [importStatus, setImportStatus] = useState('');

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
    fetchDashboardData();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus(`Importando '${file.name}'...`);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      const title = file.name.replace(/\.[^/.]+$/, '');
      try {
        const res = await fetch('/api/escriba/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title,
            content: content,
            status: 'Borrador'
          })
        });
        if (res.ok) {
          setImportStatus(`✓ '${file.name}' cargado e importado como nuevo capítulo.`);
          fetchDashboardData();
        }
      } catch (err) {
        setImportStatus(' Error al importar el archivo.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="view-container escriba-dashboard-container" style={{ padding: '24px', color: 'var(--text-primary, #f8fafc)', height: '100%', overflowY: 'auto', background: 'transparent' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', pb: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #ffffff)' }}>
              ESCRIBA — Tablero de Trabajo y Cargar Archivo
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>
            Resumen estadístico de progreso literario, estado del manuscrito e importación de archivos.
          </p>
        </div>
      </div>

      {/* Cargar Archivo / Importar Manuscrito Section */}
      <div style={{ background: 'var(--surface-elevated, rgba(255,255,255,0.03))', border: '1px solid var(--border-focus, #3b82f6)', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary, #fff)' }}>Cargar / Importar Archivo de Manuscrito</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary, #cbd5e1)' }}>
            Selecciona un archivo de texto (`.txt`, `.md`) para importarlo directamente como un nuevo capítulo.
          </p>
          {importStatus && (
            <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--accent-blue, #38bdf8)', fontWeight: 600 }}>{importStatus}</span>
          )}
        </div>

        <label style={{ padding: '10px 20px', background: 'var(--accent-blue, #3b82f6)', color: '#fff', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span>Cargar Archivo</span>
          <input type="file" accept=".txt,.md,.markdown,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ background: 'var(--surface-container, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>Total de Palabras</span>
          <span style={{ fontSize: '26px', fontWeight: 800, color: 'var(--accent-blue, #38bdf8)' }}>{stats.totalWords.toLocaleString()}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Palabras redactadas</span>
        </div>

        <div style={{ background: 'var(--surface-container, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>Tiempo de Lectura</span>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#38bdf8' }}>~{stats.readingTime} min</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>A 200 pal/min</span>
        </div>

        <div style={{ background: 'var(--surface-container, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>Capítulos Totales</span>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#34d399' }}>{stats.chapterCount}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Capítulos creados</span>
        </div>

        <div style={{ background: 'var(--surface-container, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>Entidades en Grafo</span>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#f59e0b' }}>{stats.nodeCount}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>{stats.linkCount} alianzas registradas</span>
        </div>

        <div style={{ background: 'var(--surface-container, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>Progreso Manuscrito</span>
          <span style={{ fontSize: '26px', fontWeight: 800, color: '#00e5ff' }}>{stats.completionPercentage}%</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Capítulos finalizados</span>
        </div>

      </div>

      {/* Chapter Breakdown */}
      <div style={{ background: 'var(--surface-container, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-primary, #fff)' }}>Avances y Desglose por Capítulo</h3>

        {chapters.length === 0 ? (
          <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '13px' }}>No hay capítulos registrados en el proyecto actual.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {chapters.map((chap, idx) => (
              <div key={chap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary, rgba(255,255,255,0.03))', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--accent-blue, #38bdf8)', fontWeight: 700 }}>#{idx + 1}</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-primary, #fff)' }}>{chap.title}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>{chap.wordCount || 0} palabras • ~{Math.ceil((chap.wordCount || 0) / 200)} min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '10px', background: chap.status === 'Finalizado' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: chap.status === 'Finalizado' ? '#6ee7b7' : '#fcd34d', fontWeight: 600 }}>
                    {chap.status}
                  </span>
                  <button
                    onClick={() => onNavigate('escriba_editor')}
                    style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Abrir Editor
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

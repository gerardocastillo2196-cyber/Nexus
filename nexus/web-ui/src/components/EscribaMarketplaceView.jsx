import React, { useState } from 'react';

const PROTOCOL_PACKS = [
  {
    id: 'pack-historical',
    title: 'Protocolo de Análisis Histórico y Cronológico',
    category: 'Continuidad / Mundo',
    description: 'Revisión exhaustiva de anacronismos, saltos temporales inexplicables y coherencia con la línea de tiempo del universo.',
    lenses: ['Lente de Cronología Inferida', 'Lente de Vacíos Históricos', 'Lente de Sombras de Trama'],
    author: 'Motor ESCRIBA Core',
    installed: true
  },
  {
    id: 'pack-geopolitics',
    title: 'Protocolo Geopolítico y Dinámicas de Poder',
    category: 'Facciones / Geopolítica',
    description: 'Análisis del estado de las facciones, monopolio de recursos, estratificación social y lealtades políticas.',
    lenses: ['Lente de Dinámicas de Poder', 'Lente Socioeconómica', 'Lente de Sistemas de Creencias'],
    author: 'Motor ESCRIBA Core',
    installed: true
  },
  {
    id: 'pack-domino',
    title: 'Motor de Simulación de Efecto Dominó (What-If Engine)',
    category: 'Simulación / Trama',
    description: 'Proyección táctica de alteraciones hipotéticas sobre personajes, ruptura de alianzas y vacíos de poder.',
    lenses: ['Lente de Ruptura de Alianzas', 'Lente de Asunción de Poder', 'Lente de Declaración de Conflicto'],
    author: 'Motor ESCRIBA Core',
    installed: true
  },
  {
    id: 'pack-audit',
    title: 'Auditor Literario y Supervisor de Continuidad',
    category: 'Edición / Manuscrito',
    description: 'Inspección de agujeros de guion, personajes abandonados y sugerencias tácticas para elevar la tensión del clímax.',
    lenses: ['Lente de Inconsistencias', 'Lente de Personajes Aislados', 'Lente de Cierre Narrativo'],
    author: 'Motor ESCRIBA Core',
    installed: true
  }
];

export default function EscribaMarketplaceView({ onNavigate }) {
  const [packs, setPacks] = useState(PROTOCOL_PACKS);

  const toggleInstall = (packId) => {
    setPacks(packs.map(p => p.id === packId ? { ...p, installed: !p.installed } : p));
  };

  return (
    <div className="view-container escriba-marketplace-container" style={{ padding: '24px', color: '#f8fafc', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', pb: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ESCRIBA — Tienda de Protocolos y Lentes Narrativos
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Catálogo de módulos de análisis literario, paquetes de lentes narrativos y herramientas de worldbuilding.
          </p>
        </div>
      </div>

      {/* Grid of Protocol Packs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {packs.map((pack) => (
          <div
            key={pack.id}
            style={{
              background: '#0f172a', border: pack.installed ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#818cf8', fontWeight: 700 }}>
                  {pack.category}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', color: '#fff' }}>{pack.title}</h3>
              </div>
              {pack.installed && (
                <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                  INSTALADO
                </span>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px' }}>
              {pack.description}
            </p>

            <div>
              <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Lentes Incluidos:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {pack.lenses.map((lens, idx) => (
                  <span key={idx} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', color: '#a5b4fc' }}>
                    {lens}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', pt: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Por: {pack.author}</span>
              <button
                onClick={() => toggleInstall(pack.id)}
                style={{
                  padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
                  background: pack.installed ? 'rgba(239, 68, 68, 0.15)' : '#6366f1',
                  border: pack.installed ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                  color: pack.installed ? '#fca5a5' : '#fff'
                }}
              >
                {pack.installed ? 'Desinstalar' : 'Activar Protocolo'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';

/**
 * EscribaMarkdownRenderer — Componente ligero y elegante para renderizar
 * Markdown estructurado (encabezados, listas, negritas, cursivas, citas, código)
 * con la estética Liquid Glass / Dark Mode de ESCRIBA y Nexus.
 */
export default function EscribaMarkdownRenderer({ content, style = {}, className = '' }) {
  if (!content) return null;

  const parseInline = (text) => {
    if (!text) return '';
    // Separar por bold (**), italic (*), code inline (`)
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={pIdx} style={{ color: '#cbd5e1', fontStyle: 'italic' }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#38bdf8',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.9em'
          }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const lines = typeof content === 'string' ? content.split('\n') : [String(content)];
  const renderedElements = [];
  let inCodeBlock = false;
  let codeBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Bloques de código multilínea (```)
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        renderedElements.push(
          <pre key={`code-${i}`} style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            overflowX: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#38bdf8',
            margin: '8px 0'
          }}>
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Encabezados
    if (trimmed.startsWith('#### ')) {
      renderedElements.push(
        <h5 key={`h4-${i}`} style={{ margin: '12px 0 4px 0', fontSize: '13px', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {parseInline(trimmed.substring(5))}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={`h3-${i}`} style={{ margin: '14px 0 6px 0', fontSize: '15px', color: '#60a5fa', fontWeight: 700 }}>
          {parseInline(trimmed.substring(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={`h2-${i}`} style={{ margin: '18px 0 8px 0', fontSize: '17px', color: '#ffffff', fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
          {parseInline(trimmed.substring(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={`h1-${i}`} style={{ margin: '20px 0 10px 0', fontSize: '19px', color: '#ffffff', fontWeight: 800 }}>
          {parseInline(trimmed.substring(2))}
        </h2>
      );
      continue;
    }

    // Divisores horizontales
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      renderedElements.push(
        <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: '16px 0' }} />
      );
      continue;
    }

    // Citas / Blockquotes
    if (trimmed.startsWith('> ')) {
      renderedElements.push(
        <div key={`quote-${i}`} style={{
          borderLeft: '3px solid #6366f1',
          paddingLeft: '12px',
          margin: '8px 0',
          color: '#cbd5e1',
          fontStyle: 'italic',
          background: 'rgba(99, 102, 241, 0.05)',
          padding: '8px 12px',
          borderRadius: '0 6px 6px 0'
        }}>
          {parseInline(trimmed.substring(2))}
        </div>
      );
      continue;
    }

    // Listas con viñetas
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
      renderedElements.push(
        <div key={`li-${i}`} style={{ display: 'flex', gap: '8px', margin: '4px 0 4px 12px', lineHeight: 1.5 }}>
          <span style={{ color: '#60a5fa', fontWeight: 700 }}>•</span>
          <span style={{ color: '#e2e8f0', flex: 1 }}>{parseInline(trimmed.substring(2))}</span>
        </div>
      );
      continue;
    }

    // Listas numeradas (1. 2. etc.)
    const numMatch = trimmed.match(/^([0-9]+)\.\s+(.*)/);
    if (numMatch) {
      renderedElements.push(
        <div key={`num-${i}`} style={{ display: 'flex', gap: '8px', margin: '4px 0 4px 12px', lineHeight: 1.5 }}>
          <span style={{ color: '#a5b4fc', fontWeight: 700, minWidth: '18px' }}>{numMatch[1]}.</span>
          <span style={{ color: '#e2e8f0', flex: 1 }}>{parseInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Líneas vacías
    if (!trimmed) {
      renderedElements.push(<div key={`empty-${i}`} style={{ height: '8px' }} />);
      continue;
    }

    // Párrafos regulares
    renderedElements.push(
      <p key={`p-${i}`} style={{ margin: '4px 0', lineHeight: 1.6, color: '#e2e8f0' }}>
        {parseInline(rawLine)}
      </p>
    );
  }

  return (
    <div className={`escriba-markdown-rendered ${className}`} style={{ fontSize: '13px', lineHeight: 1.6, ...style }}>
      {renderedElements}
    </div>
  );
}

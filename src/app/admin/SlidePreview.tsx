import type { Slide } from '@/lib/admin/brand';

/**
 * Preview do slide a 1/3 do tamanho final (template renderiza a 1080x1350,
 * canvas aqui mede 360x450). Espelha o template.html: marca top-left com
 * icone, credito bottom-left, paginacao bottom-center, gradiente bordeaux
 * -> escuro, modo split (imagem topo + texto fundo) ou full (imagem inteira
 * com escurecimento) consoante design.imagePosition.
 */
export function SlidePreview({ slide, totalSlides = 8 }: { slide: Slide; totalSlides?: number }) {
  const layout = slide.layout || slide.design.layout || 'conteudo';
  const html = renderBody(slide.body);
  const imgUrl = slide.design.imageUrl;
  const imagePos: 'full' | 'split' = ((slide.design as Record<string, unknown>).imagePosition as 'full' | 'split') || 'split';
  const mode: 'full' | 'split' | 'text' = imgUrl ? imagePos : 'text';
  const idx = slide.idx ?? 0;

  // Cores (matches template.html embedded styles)
  const bg = '#1A1410';
  const bgTop = '#5A1A2A';
  const texto = '#F2E8DC';
  const acento = '#E08496';

  // Tipografia (template usa px reais a 1080x1350; aqui dividimos por 3)
  const bodySize =
    layout === 'capa' ? 29 :
    layout === 'cta' ? 24 :
    layout === 'assinatura' ? 22 :
    27;
  const bodyWeight = layout === 'capa' ? 700 : 500;

  return (
    <div
      className="slide-canvas"
      style={{
        background: `linear-gradient(to bottom, ${bgTop} 0%, ${bg} 60%)`,
        color: texto,
        fontFamily: 'EB Garamond, Georgia, serif',
        overflow: 'hidden',
        padding: 0,
      }}
    >
      {/* Imagem de fundo · modo split = topo, modo full = inteira */}
      {mode === 'split' && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
            zIndex: 0, overflow: 'hidden',
            backgroundImage: `url(${imgUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', top: '25%', left: 0, right: 0, height: '25%',
            zIndex: 1,
            background: `linear-gradient(to bottom, transparent, ${bgTop})`,
          }} />
        </>
      )}
      {mode === 'full' && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url(${imgUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'brightness(0.45) contrast(1.1)'
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: `linear-gradient(to bottom, rgba(26,20,16,0.1) 0%, rgba(26,20,16,0.85) 55%, rgba(26,20,16,0.97) 100%)`
          }} />
        </>
      )}

      {/* Marca top-LEFT com icone (template real: 34/44px, escala /3 ≈ 11/15) */}
      <div style={{
        position: 'absolute', top: 11, left: 15, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 4,
        textShadow: imgUrl ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
      }}>
        <span style={{ color: acento, fontSize: 14, lineHeight: 1 }}>✦</span>
        <span style={{
          fontSize: 10, fontStyle: 'italic', fontWeight: 500,
          color: texto, opacity: 0.95, letterSpacing: '0.02em',
        }}>SyncHim</span>
      </div>

      {/* Credito bottom-LEFT */}
      <div style={{
        position: 'absolute', bottom: 13, left: 16, zIndex: 10,
        fontSize: 7, color: texto, opacity: 0.45, letterSpacing: '0.04em',
        textShadow: imgUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none',
      }}>© viviannedossantos</div>

      {/* Paginacao bottom-CENTER */}
      <div style={{
        position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
        display: 'flex', gap: 3,
      }}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div key={i} style={{
            width: 3, height: 3, borderRadius: '50%',
            background: i === idx ? texto : 'rgba(242,232,220,0.25)',
          }} />
        ))}
      </div>

      {/* Texto */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: mode === 'text' ? '33px 20px 30px' : '10px 20px 30px',
        height: mode === 'text' ? '100%' : '55%',
        display: 'flex', flexDirection: 'column',
        justifyContent:
          layout === 'cta' || layout === 'assinatura' ? 'center' :
          mode === 'text' ? 'flex-end' : 'flex-end',
        textAlign: layout === 'cta' || layout === 'assinatura' ? 'center' : 'left',
        zIndex: 2,
        textShadow: imgUrl ? '0 1px 6px rgba(0,0,0,0.4)' : 'none',
      }}>
        <div
          style={{
            fontSize: bodySize,
            lineHeight: 1.08,
            fontWeight: bodyWeight,
            letterSpacing: '-0.01em',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {(layout === 'assinatura' || layout === 'cta') && (
          <div style={{ color: acento, fontSize: 12, marginTop: 8 }}>✦</div>
        )}
        {layout === 'assinatura' && (
          <div style={{
            marginTop: 6, fontSize: 8, color: texto, opacity: 0.7, letterSpacing: '0.04em',
            fontStyle: 'italic',
          }}>
            Vivianne dos Santos
          </div>
        )}
      </div>
    </div>
  );
}

export function SlideThumb({ slide }: { slide: Slide }) {
  const html = renderBody(slide.body);
  const imgUrl = slide.design.imageUrl;
  return (
    <div className="slide-thumb" style={imgUrl ? {
      backgroundImage: `url(${imgUrl})`,
      backgroundSize: 'cover', backgroundPosition: 'center'
    } : undefined}>
      <span className="num">SLIDE {String(slide.idx + 1).padStart(2, '0')}</span>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export function renderBody(src: string): string {
  const escaped = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const lines = escaped.split(/\n\n+/).map((par) => {
    const inline = par
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#E08496;font-weight:700">$1</strong>')
      .replace(/_(.+?)_/g, '<em style="color:#E08496;font-style:italic">$1</em>')
      .replace(/\n/g, '<br/>');
    return `<p style="margin:0 0 6px">${inline}</p>`;
  });
  return lines.join('');
}

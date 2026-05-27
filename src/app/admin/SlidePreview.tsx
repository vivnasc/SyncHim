import type { Slide } from '@/lib/admin/brand';

/**
 * Preview do slide com imagem de fundo (espelha template.html).
 * Se slide.design.imageUrl existir, mostra a imagem com gradiente
 * escuro e texto sobreposto. Se não, fundo sólido.
 */
export function SlidePreview({ slide }: { slide: Slide }) {
  const layout = slide.layout || slide.design.layout || 'conteudo';
  const html = renderBody(slide.body);
  const imgUrl = slide.design.imageUrl;
  const numero = slide.design.numero ?? slide.idx;

  return (
    <div
      className="slide-canvas"
      style={{ justifyContent: layout === 'capa' || layout === 'cta' ? 'center' : 'flex-end' }}
    >
      {/* Fundo: imagem ou sólido */}
      {imgUrl ? (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            backgroundImage: `url(${imgUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'brightness(0.55) contrast(1.1) saturate(0.85)'
          }} />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to bottom, rgba(26,20,16,0.15) 0%, rgba(26,20,16,0.30) 35%, rgba(26,20,16,0.85) 65%, rgba(26,20,16,0.95) 100%)'
          }} />
        </>
      ) : null}

      {/* Marca */}
      <div style={{
        position: 'absolute', top: 12, right: 16, zIndex: 3,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
        color: 'var(--texto)', opacity: 0.9,
        textShadow: imgUrl ? '0 1px 6px rgba(0,0,0,0.5)' : 'none'
      }}>
        <span style={{ color: 'var(--ouro-folha)', fontSize: 14 }}>✦</span>
        <span>SyncHim</span>
      </div>

      {/* Número */}
      {layout !== 'capa' && numero != null && (
        <div style={{
          position: 'absolute', top: 12, left: 16, zIndex: 3,
          fontSize: 9, letterSpacing: '0.15em', color: 'var(--texto)', opacity: 0.7,
          textShadow: imgUrl ? '0 1px 4px rgba(0,0,0,0.4)' : 'none'
        }}>
          {String(numero + 1).padStart(2, '0')} / 08
        </div>
      )}

      {/* Conteúdo */}
      <div style={{
        position: 'relative', zIndex: 2,
        padding: layout === 'capa' ? '24px' : '18px 24px 24px',
        textAlign: layout === 'capa' || layout === 'cta' || layout === 'assinatura' ? 'center' : 'left',
        textShadow: imgUrl ? '0 2px 12px rgba(0,0,0,0.5)' : 'none'
      }}>
        {(layout === 'capa' || layout === 'cta' || slide.design.goldLine) && (
          <div style={{ width: 30, height: 1.5, background: 'var(--ouro)', margin: layout === 'capa' || layout === 'cta' ? '0 auto 10px' : '0 0 10px' }} />
        )}
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {(layout === 'assinatura' || layout === 'cta') && (
          <div style={{ color: 'var(--ouro-folha)', fontSize: 18, marginTop: 10 }}>✦</div>
        )}
        {layout === 'assinatura' && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--texto)', opacity: 0.85, letterSpacing: '0.04em' }}>
            &mdash;<br/>Vivianne dos Santos
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
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return `<p>${inline}</p>`;
  });
  return lines.join('');
}

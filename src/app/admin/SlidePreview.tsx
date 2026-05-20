import type { Slide } from '@/lib/admin/brand';

/**
 * Preview do slide tal como ele será renderizado pelo template
 * Puppeteer. A intenção é fidelidade — qualquer mudança aqui deve
 * espelhar tools/render-carrossel/template.html.
 *
 * Renderiza dentro de um canvas escalado (.slide-canvas em admin.css).
 */
export function SlidePreview({ slide }: { slide: Slide }) {
  const layout = slide.layout || slide.design.layout || 'conteudo';
  const html = renderBody(slide.body);
  const numero = slide.design.numero ?? slide.idx;

  return (
    <div className="slide-canvas">
      {layout !== 'cta' && layout !== 'capa' && numero !== null && (
        <span className="ghost-num">{String(numero).padStart(2, '0')}</span>
      )}
      <div className={`layer ${layout === 'capa' || layout === 'cta' || layout === 'assinatura' ? 'center' : ''}`}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      {(layout === 'assinatura' || layout === 'cta') && (
        <div className="mark">✦</div>
      )}
    </div>
  );
}

export function SlideThumb({ slide }: { slide: Slide }) {
  const html = renderBody(slide.body);
  return (
    <div className="slide-thumb">
      <span className="num">SLIDE {String(slide.idx + 1).padStart(2, '0')}</span>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Markdown leve: **bold** -> <strong>, _italic_ -> <em>, quebras de linha.
 * Os utilizadores escrevem prosa, não HTML; sanitizamos restando só estas
 * regras + escape de < > &.
 */
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

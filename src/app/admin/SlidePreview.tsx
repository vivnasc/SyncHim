import type { Slide } from '@/lib/admin/brand';
import { EstrelaPersa } from '@/components/marks/EstrelaPersa';

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

  // Tipografia (template usa px reais a 1080x1350; aqui dividimos por 3).
  // Texto-puro ganha +alguns px para preencher o slide e dar identidade.
  const isTextOnly = !imgUrl;
  const bodySize =
    layout === 'capa' ? (isTextOnly ? 48 : 45) :
    layout === 'cta' ? 33 :
    layout === 'assinatura' ? 29 :
    isTextOnly ? 44 : 41;
  const bodyWeight =
    layout === 'capa' ? 800 :
    layout === 'cta' ? 700 :
    layout === 'assinatura' ? 600 :
    600;

  // Numero fantasma so em slides de conteudo texto-puro (sem imagem):
  // da identidade editorial sem ser decorativo (e o numero do slide).
  const showGhostNum = mode === 'text' && layout === 'conteudo';

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
      {/* Textura pergaminho subtilissima (matches template.html) */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        opacity: 0.05,
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.97  0 0 0 0 0.91  0 0 0 0 0.82  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>")`,
      }} />

      {/* Numero fantasma editorial */}
      {showGhostNum && (
        <div style={{
          position: 'absolute', top: 44, right: 30, zIndex: 1,
          fontFamily: 'EB Garamond, Georgia, serif', fontStyle: 'italic',
          fontSize: 110, lineHeight: 1, color: acento,
          opacity: 0.18, letterSpacing: '-0.04em',
          pointerEvents: 'none',
        }}>
          {String(idx + 1).padStart(2, '0')}
        </div>
      )}
      {/* Imagem de fundo · modo split (estilo FreeMe):
          - imagem ocupa 62% no topo
          - gradiente separado (45%-73%) faz bridge para o bg da pagina
          - texto fica nos 42% inferiores sem corte abrupto */}
      {mode === 'split' && (
        <>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '62%',
            zIndex: 0, overflow: 'hidden',
            backgroundImage: `url(${imgUrl})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', top: '45%', left: 0, right: 0, height: '28%',
            zIndex: 1, pointerEvents: 'none',
            background: `linear-gradient(to bottom,
              transparent 0%,
              rgba(26,20,16,0.55) 50%,
              ${bg} 100%)`,
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

      {/* Marca top-LEFT com estrela persa oficial (template real: icone 32px) */}
      <div style={{
        position: 'absolute', top: 11, left: 15, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        textShadow: imgUrl ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
        color: acento,
      }}>
        <div style={{ width: 14, height: 14, lineHeight: 0 }}>
          <EstrelaPersa strokeWidth={1.4} />
        </div>
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

      {/* Texto.
          - Modo split/full (com imagem): texto encostado em baixo, na metade
            inferior, sobre o gradiente.
          - Modo text (sem imagem): texto centrado verticalmente — preenche o
            slide e evita a metade superior vazia.
          - CTA/assinatura: sempre centrado. */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: mode === 'text' ? '50px 22px' : '0 20px 32px',
        height: mode === 'text' ? '100%' : '42%',
        display: 'flex', flexDirection: 'column',
        justifyContent:
          layout === 'cta' || layout === 'assinatura' ? 'center' :
          mode === 'text' ? 'center' : 'flex-end',
        textAlign: layout === 'cta' || layout === 'assinatura' ? 'center' : 'left',
        zIndex: 2,
        textShadow: imgUrl ? '0 1px 6px rgba(0,0,0,0.4)' : 'none',
      }}>
        <div
          style={{
            fontSize: bodySize,
            lineHeight: 1.02,
            fontWeight: bodyWeight,
            letterSpacing: '-0.02em',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {(layout === 'assinatura' || layout === 'cta') && (
          <div style={{
            width: 22, height: 22, marginTop: 8, color: acento,
            alignSelf: layout === 'cta' || layout === 'assinatura' ? 'center' : 'flex-start',
            lineHeight: 0,
          }}>
            <EstrelaPersa strokeWidth={1.2} />
          </div>
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
    // [\s\S]+? em vez de .+? para atravessar quebras de linha
    // (ex: "**linha 1\nlinha 2**" deve ficar bold inteiro).
    // Pesos alinhados com template.html: bold 800, italic 700 (era 500
    // antes — italic ficava demasiado suave comparado com FreeMe).
    const inline = par
      .replace(/\*\*([\s\S]+?)\*\*/g, '<strong style="color:#E08496;font-weight:800">$1</strong>')
      .replace(/_([\s\S]+?)_/g, '<em style="color:#E08496;font-style:italic;font-weight:700">$1</em>')
      .replace(/\n/g, '<br/>');
    return `<p style="margin:0 0 9px">${inline}</p>`;
  });
  return lines.join('');
}

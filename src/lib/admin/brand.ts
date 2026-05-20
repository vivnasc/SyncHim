/**
 * Tokens de marca SyncHim. Fonte única de verdade partilhada entre
 * o admin UI e os templates de render (Puppeteer).
 *
 * Espelha src/app/globals.css e assets/tokens.css.
 */

export const BRAND = {
  bg: '#1A1410',
  bgElev: '#201914',
  texto: '#F2E8DC',
  textoSuave: '#A39B8E',
  ouro: '#B8843D',
  ouroFolha: '#D4A857',
  bordeaux: '#8B2235',
  linha: '#3A2E22',
  serif: 'EB Garamond, Cormorant Garamond, Georgia, serif',
  body: 'Spectral, Lora, Georgia, serif',
  sans: 'Inter, system-ui, sans-serif'
} as const;

export type CarouselLayout = 'capa' | 'conteudo' | 'cta' | 'assinatura';
export type VideoSubtype = 'talking-head' | 'kinetic-text' | 'hands-writing';

export type SlideDesign = {
  layout?: CarouselLayout;
  fundo?: string;            // override do bg do slide
  acento?: string;           // override do ouro
  textoCor?: string;         // override da cor de texto
  letrina?: string | null;   // letra grande no canto
  numero?: number | null;    // número do slide (ghost-num)
  ornamento?: 'estrela' | 'rosaceo' | 'vesica' | null;
  italico?: boolean;
  alinhamento?: 'left' | 'center';
  tituloPx?: number;         // override do font-size
};

export type Slide = {
  idx: number;
  layout: CarouselLayout;
  body: string;
  design: SlideDesign;
};

export const CATEGORIAS_CARROSSEL = {
  'didatico-A': { label: 'Tipo A — Diagnóstico encoberto', range: [1, 10] },
  'didatico-B': { label: 'Tipo B — Mecânica revelada', range: [11, 20] },
  'didatico-C': { label: 'Tipo C — Mito desmontado', range: [21, 30] },
  'didatico-D': { label: 'Tipo D — Verdade que dói', range: [31, 40] },
  reconhecimento: { label: 'Reconhecimento (frases)', range: [41, 55] },
  cta: { label: 'CTA — convite ao diagnóstico', range: [56, 60] }
} as const;

export const VIDEO_SUBTIPOS = {
  'talking-head': 'Talking head (voz + close)',
  'kinetic-text': 'Kinetic text (texto animado)',
  'hands-writing': 'Hands writing (mão a escrever)'
} as const;

export const PLATAFORMAS = ['ig', 'tiktok', 'youtube'] as const;

export const FORMATO_CARROSSEL = {
  width: 1080,
  height: 1350 // vertical IG carrossel
} as const;

export const FORMATO_VIDEO = {
  width: 1080,
  height: 1920, // 9:16 reels
  fps: 30
} as const;

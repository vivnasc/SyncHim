#!/usr/bin/env node
/**
 * Rasteriza public/icon.svg em PNGs para o PWA manifest.
 * Corre: `node scripts/generate-pwa-icons.mjs`.
 *
 * Saídas:
 *   public/icons/icon-192.png         (any)
 *   public/icons/icon-512.png         (any)
 *   public/icons/icon-maskable-512.png (maskable — 80% safe zone)
 *   public/icons/apple-touch-icon.png (180x180)
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const root = path.resolve(process.cwd());
const svgPath = path.join(root, 'src/app/icon.svg');
const svg = readFileSync(svgPath, 'utf-8');
const outDir = path.join(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

function rasterize(svgString, size) {
  const r = new Resvg(svgString, { fitTo: { mode: 'width', value: size } });
  return r.render().asPng();
}

function maskableSvg(svg, padding = 0.12) {
  // Envolver o ícone num "safe zone" de 80% — exigência Android para
  // o purpose 'maskable'. Renderizamos o original num quadrado central
  // dentro de um fundo a toda a largura.
  const inset = Math.round(padding * 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#1A1410"/>
    <g transform="translate(${inset} ${inset}) scale(${(100 - 2 * inset) / 64})">
      ${svg.replace(/<\?xml[^>]*\?>/, '').replace(/<\/?svg[^>]*>/g, '').replace(/<rect[^>]*fill="#1A1410"[^>]*\/>/, '')}
    </g>
  </svg>`;
}

const out = {
  'icon-192.png': rasterize(svg, 192),
  'icon-512.png': rasterize(svg, 512),
  'apple-touch-icon.png': rasterize(svg, 180),
  'icon-maskable-512.png': rasterize(maskableSvg(svg), 512)
};

for (const [name, buf] of Object.entries(out)) {
  const p = path.join(outDir, name);
  writeFileSync(p, buf);
  console.log('•', p, `(${buf.length} bytes)`);
}

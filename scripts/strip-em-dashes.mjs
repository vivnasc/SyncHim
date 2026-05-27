#!/usr/bin/env node
/**
 * Regra de escrita da SyncHim: nunca usar travessões (em-dash , nem
 * en-dash –) no corpo. A única excepção é a assinatura visual,
 * elemento de marca, que está num componente (EstrelaPersa,
 * não em texto).
 *
 * Este script substitui em-dash/en-dash por vírgula em ficheiros de
 * conteúdo e copy. Aplica:
 *   - " — "  →  ", "
 *   - " – "  →  ", "
 *   - "—"     →  ","   (sem espaço, mais raro)
 *
 * Alvo: copy editorial. NÃO mexe em ficheiros admin (UI técnica),
 * empty-states ('—' como placeholder), nem MORNING.md/README.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = [
  'content',
  'versao-solteira',
  'synchim-sessoes-6-7',
  'messages',
  path.join('src', 'lib', 'no-content.ts'),
  path.join('src', 'lib', 'no-content-variants.ts'),
  path.join('src', 'lib', 'diagnostic-variants.ts'),
  path.join('src', 'lib', 'diagnostic.ts'),
  path.join('src', 'app', '[locale]'),
  path.join('src', 'components', 'SaudacaoSubPerfil.tsx')
];

const EXTS = new Set(['.md', '.json', '.ts', '.tsx']);

function walk(p, out) {
  const s = statSync(p);
  if (s.isFile()) {
    if (EXTS.has(path.extname(p))) out.push(p);
    return;
  }
  if (s.isDirectory()) {
    for (const e of readdirSync(p)) {
      // Skip node_modules and .next defensively
      if (e === 'node_modules' || e === '.next' || e === '.git') continue;
      walk(path.join(p, e), out);
    }
  }
}

const files = [];
for (const t of TARGETS) {
  const full = path.join(ROOT, t);
  try { walk(full, files); } catch { /* missing path */ }
}

let touched = 0;
let replacements = 0;

for (const f of files) {
  let raw;
  try { raw = readFileSync(f, 'utf-8'); } catch { continue; }
  const before = raw;
  // " — " ou " – " (espaços a rodear) → ", "
  let out = raw.replace(/\s+[—–]\s+/g, ', ');
  // "—" colado (sem espaços) → ","
  out = out.replace(/[—–]/g, ',');
  // Compactar duplicações tipo ",, ," → ","
  out = out.replace(/(?:,\s*){2,}/g, ', ');
  if (out !== before) {
    const delta = (before.match(/[—–]/g) || []).length;
    writeFileSync(f, out);
    touched++;
    replacements += delta;
    console.log(' •', path.relative(ROOT, f), `(${delta})`);
  }
}

console.log(`\ndone: ${touched} ficheiros, ${replacements} travessões substituídos.`);

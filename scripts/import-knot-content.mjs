#!/usr/bin/env node
/**
 * Importa o conteúdo Tier 1+2 que está disperso em duas pastas raiz:
 *   - versao-solteira/no-{no}-sessao-{n}.md  (sessões 3-5 solteira)
 *   - versao-solteira/no-{no}-praticas.md    (práticas solteira)
 *   - synchim-sessoes-6-7/*.md               (sessões 6+7, casada E solteira)
 *
 * Como os ficheiros em synchim-sessoes-6-7/ têm nomes baralhados (upload
 * em lote), classificamos cada ficheiro lendo o primeiro cabeçalho:
 *   # SESSÃO N, A FOME: ... (casada|solteira)
 *
 * Saída:
 *   content/pt/nos/{no}/sessao-{3..7}.md                (casada)
 *   content/pt/nos/{no}/solteira/sessao-{3..7}.md       (solteira)
 *   content/pt/praticas/{no}/index.md                   (casada — se existir)
 *   content/pt/praticas/{no}/solteira/index.md          (solteira)
 *
 * Idempotente: re-correr sobrescreve com a versão actual nas pastas raiz.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_67 = path.join(ROOT, 'synchim-sessoes-6-7');
const SRC_SOLT = path.join(ROOT, 'versao-solteira');
const OUT_NOS = path.join(ROOT, 'content/pt/nos');
const OUT_PRAT = path.join(ROOT, 'content/pt/praticas');

const NO_MAP = {
  FOME: 'fome',
  CONTROLO: 'controlo',
  INFERIORIDADE: 'inferioridade',
  DESCONFIANÇA: 'desconfianca',
  DESCONFIANCA: 'desconfianca',
  SALVADORA: 'salvadora',
  ABANDONO: 'abandono',
  INVISIBILIDADE: 'invisibilidade'
};

/** Lê o primeiro cabeçalho do markdown e devolve {n, no, target} ou null. */
function classify(file) {
  const text = readFileSync(file, 'utf-8');
  const first = text.split('\n').find((l) => l.startsWith('# SESS')) || '';
  // Ex: "# SESSÃO 7, A INVISIBILIDADE: O VOO (solteira)"
  const m = first.match(/SESS[ÃA]O\s+(\d+)\s*,\s*[OAoa]\s+([A-ZÀ-ſ]+)\s*:\s*[^()]*\(([^)]+)\)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const noKey = m[2].toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents EXCEPT for keys we kept above
    .replace(/[^A-Z]/g, '');
  // Re-map: stripping accents turns DESCONFIANÇA → DESCONFIANCA which is in NO_MAP
  const no = NO_MAP[m[2].toUpperCase()] || NO_MAP[noKey];
  const target = m[3].trim().toLowerCase().includes('solt') ? 'solteira' : 'casada';
  if (!no || !n) return null;
  return { n, no, target };
}

function mkdirs(p) { mkdirSync(p, { recursive: true }); }
function writeOut(p, content) { mkdirs(path.dirname(p)); writeFileSync(p, content); }

// ---------- 1. Sessões 6 + 7 (per-nó, ambos contextos) ----------
let count67 = 0;
const seen = new Map(); // chave "no-n-target" → file (para resolver duplicados)
const files67 = readdirSync(SRC_67).filter((f) => f.endsWith('.md'));
for (const f of files67) {
  const full = path.join(SRC_67, f);
  const c = classify(full);
  // Saltam apenas ficheiros sem cabeçalho SESSÃO N (ex: a spec
  // "no-salvadora-sessao-06 (1).md" começa com "# SyncHim, Sessões 6 e 7").
  if (!c) { console.warn('skip (no header):', f); continue; }
  const key = `${c.no}-${c.n}-${c.target}`;
  if (seen.has(key)) {
    // dois ficheiros mapeiam para a mesma cell — escolhemos o que NÃO tem " (N)" no nome
    // (preferindo o filename canónico do upload mais recente)
    const prev = seen.get(key);
    if (/ \(\d+\)\./.test(prev) && !/ \(\d+\)\./.test(f)) {
      seen.set(key, f);
    }
    continue;
  }
  seen.set(key, f);
}
for (const [key, fname] of seen) {
  const [no, nStr, target] = key.split('-');
  const out = target === 'casada'
    ? path.join(OUT_NOS, no, `sessao-0${nStr}.md`)
    : path.join(OUT_NOS, no, 'solteira', `sessao-0${nStr}.md`);
  writeOut(out, readFileSync(path.join(SRC_67, fname), 'utf-8'));
  count67++;
}
console.log(`sessões 6+7 importadas: ${count67}`);

// ---------- 2. Sessões 3-5 + práticas solteira ----------
let count35 = 0;
const filesS = readdirSync(SRC_SOLT).filter((f) => f.endsWith('.md'));
for (const f of filesS) {
  // formato: no-{no}-sessao-{n}.md  ou  no-{no}-praticas.md
  const m = f.match(/^no-([a-z]+)-(sessao-\d+|praticas)\.md$/i);
  if (!m) { continue; } // ignora 00-logica, resultados-..., etc
  const no = m[1].toLowerCase();
  if (!Object.values(NO_MAP).includes(no)) continue;
  const slot = m[2];
  const content = readFileSync(path.join(SRC_SOLT, f), 'utf-8');
  if (slot === 'praticas') {
    writeOut(path.join(OUT_PRAT, no, 'solteira', 'index.md'), content);
  } else {
    writeOut(path.join(OUT_NOS, no, 'solteira', `${slot}.md`), content);
  }
  count35++;
}
console.log(`sessões 3-5 + práticas solteira importadas: ${count35}`);

// ---------- 3. Sanidade: lista o que está em falta ----------
const NOS = Object.values(NO_MAP).filter((v, i, a) => a.indexOf(v) === i);
const TARGETS = ['casada', 'solteira'];
const SESSIONS = [3, 4, 5, 6, 7];
const missing = [];
for (const no of NOS) {
  for (const target of TARGETS) {
    for (const n of SESSIONS) {
      const p = target === 'casada'
        ? path.join(OUT_NOS, no, `sessao-0${n}.md`)
        : path.join(OUT_NOS, no, 'solteira', `sessao-0${n}.md`);
      if (!existsSync(p)) missing.push(`${no} · ${target} · sessao ${n}`);
    }
    const pr = target === 'casada'
      ? path.join(OUT_PRAT, no, 'index.md')
      : path.join(OUT_PRAT, no, 'solteira', 'index.md');
    if (!existsSync(pr)) missing.push(`${no} · ${target} · praticas`);
  }
}
if (missing.length > 0) {
  console.log('\nEm falta:');
  missing.forEach((m) => console.log(' -', m));
} else {
  console.log('\nTudo presente para os 7 nós × 2 targets × sessões 3-7 + práticas.');
}

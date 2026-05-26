import matter from 'gray-matter';
import fs from 'node:fs';
import path from 'node:path';
import type { Locale, No } from './diagnostic';
import type { Target } from './target';

// Os ficheiros legais e as sessões comuns são pequenos e sempre necessários,
// por isso continuam a ser importados estaticamente (bundled at build time).
import ptSessao01 from '@content/pt/sessao-01.md';
import ptSessao02 from '@content/pt/sessao-02.md';
import ptSessao06Common from '@content/pt/sessao-06.md';
import ptSessao07Common from '@content/pt/sessao-07.md';
import ptLegalGarantia from '@content/pt/legal/garantia.md';
import ptLegalPrivacidade from '@content/pt/legal/privacidade.md';
import ptLegalTermos from '@content/pt/legal/termos.md';

import enSessao01 from '@content/en/sessao-01.md';
import enSessao02 from '@content/en/sessao-02.md';
import enSessao06 from '@content/en/sessao-06.md';
import enSessao07 from '@content/en/sessao-07.md';
import enLegalGarantia from '@content/en/legal/garantia.md';
import enLegalPrivacidade from '@content/en/legal/privacidade.md';
import enLegalTermos from '@content/en/legal/termos.md';

const COMMON_SESSIONS: Record<Locale, Record<1 | 2 | 6 | 7, string>> = {
  pt: { 1: ptSessao01, 2: ptSessao02, 6: ptSessao06Common, 7: ptSessao07Common },
  en: { 1: enSessao01, 2: enSessao02, 6: enSessao06, 7: enSessao07 }
};

export const LEGAL: Record<'garantia' | 'privacidade' | 'termos', Record<Locale, string>> = {
  garantia: { pt: ptLegalGarantia, en: enLegalGarantia },
  privacidade: { pt: ptLegalPrivacidade, en: enLegalPrivacidade },
  termos: { pt: ptLegalTermos, en: enLegalTermos }
};

/**
 * Sessões 3-7 por nó (e práticas) vivem em ficheiros separados por
 * (nó × locale × target). Como agora existem 7 nós × 2 targets, manter
 * imports estáticos torna-se 140+ linhas frágeis. Optamos por leitura
 * via fs com cache em memória: o conteúdo é estático durante a vida
 * do deploy, por isso ler uma vez basta.
 *
 * Vercel: o tracer não inclui content/ automaticamente; ver
 * `next.config.mjs` outputFileTracingIncludes.
 */
const CACHE = new Map<string, string | null>();

function readFile(absPath: string): string | null {
  if (CACHE.has(absPath)) return CACHE.get(absPath) ?? null;
  try {
    const raw = fs.readFileSync(absPath, 'utf-8');
    CACHE.set(absPath, raw);
    return raw;
  } catch {
    CACHE.set(absPath, null);
    return null;
  }
}

function knotSessionPath(locale: Locale, no: No, n: number, target: Target): string {
  const sub = target === 'solteira' ? 'solteira/' : '';
  // EN keeps the old "knots/<english-no>" folder layout for the existing
  // canonical (casada) content. Solteira EN ainda não existe — voltamos a
  // casada via fallback no chamador.
  if (locale === 'en') {
    const enNo = { fome: 'hunger', controlo: 'control', inferioridade: 'inferiority',
                   desconfianca: 'distrust', salvadora: 'savior', abandono: 'abandonment',
                   invisibilidade: 'invisibility' }[no];
    return path.join(process.cwd(), 'content/en/knots', enNo!, `${sub}sessao-${String(n).padStart(2, '0')}.md`);
  }
  return path.join(process.cwd(), 'content/pt/nos', no, sub, `sessao-${String(n).padStart(2, '0')}.md`);
}

function knotPracticesPath(locale: Locale, no: No, target: Target): string {
  const sub = target === 'solteira' ? 'solteira/' : '';
  if (locale === 'en') {
    const enNo = { fome: 'hunger', controlo: 'control', inferioridade: 'inferiority',
                   desconfianca: 'distrust', salvadora: 'savior', abandono: 'abandonment',
                   invisibilidade: 'invisibility' }[no];
    return path.join(process.cwd(), 'content/en/practices', enNo!, `${sub}index.md`);
  }
  return path.join(process.cwd(), 'content/pt/praticas', no, sub, 'index.md');
}

function parse(raw: string | undefined | null): { content: string; data: Record<string, unknown> } | null {
  if (!raw) return null;
  const { content, data } = matter(raw);
  return { content, data: data as Record<string, unknown> };
}

export async function getCommonSession(locale: Locale, n: 1 | 2 | 6 | 7) {
  return parse(COMMON_SESSIONS[locale]?.[n]);
}

/**
 * Carrega a sessão Tier 1 de um nó. Cai para o target oposto se o pedido
 * não existir (a editora pode ainda não ter escrito a variante casada de
 * todos os nós; mantém o produto vendável).
 */
export async function getKnotSession(locale: Locale, no: No, n: 3 | 4 | 5 | 6 | 7, target: Target = 'casada') {
  const direct = readFile(knotSessionPath(locale, no, n, target));
  if (direct) return parse(direct);
  // fallback ao target oposto na mesma locale
  const other: Target = target === 'casada' ? 'solteira' : 'casada';
  const cross = readFile(knotSessionPath(locale, no, n, other));
  if (cross) return parse(cross);
  // fallback EN → PT (para nós ainda não traduzidos)
  if (locale === 'en') {
    const ptDirect = readFile(knotSessionPath('pt', no, n, target));
    if (ptDirect) return parse(ptDirect);
    const ptCross = readFile(knotSessionPath('pt', no, n, other));
    if (ptCross) return parse(ptCross);
  }
  // último fallback: sessão comum (para 6/7 ainda em formato legacy)
  if (n === 6 || n === 7) return parse(COMMON_SESSIONS[locale]?.[n]);
  return null;
}

export async function getKnotPractices(locale: Locale, no: No, target: Target = 'casada') {
  const direct = readFile(knotPracticesPath(locale, no, target));
  if (direct) return parse(direct);
  const other: Target = target === 'casada' ? 'solteira' : 'casada';
  const cross = readFile(knotPracticesPath(locale, no, other));
  if (cross) return parse(cross);
  // fallback EN → PT
  if (locale === 'en') {
    const ptDirect = readFile(knotPracticesPath('pt', no, target));
    if (ptDirect) return parse(ptDirect);
    return parse(readFile(knotPracticesPath('pt', no, other)));
  }
  return null;
}

export async function getSession(locale: Locale, no: No, n: number, target: Target = 'casada') {
  if (n === 1 || n === 2) {
    return getCommonSession(locale, n);
  }
  if (n === 3 || n === 4 || n === 5 || n === 6 || n === 7) {
    return getKnotSession(locale, no, n, target);
  }
  return null;
}

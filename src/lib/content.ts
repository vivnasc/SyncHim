import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Locale, No } from './diagnostic';

const ROOT = path.join(process.cwd(), 'content');

const KNOT_DIR: Record<Locale, string> = { pt: 'nos', en: 'knots' };
const PRACTICE_DIR: Record<Locale, string> = { pt: 'praticas', en: 'practices' };

const KNOT_FOLDER: Record<No, { pt: string; en: string }> = {
  fome: { pt: 'fome', en: 'hunger' },
  controlo: { pt: 'controlo', en: 'grip' },
  inferioridade: { pt: 'inferioridade', en: 'smallness' },
  desconfianca: { pt: 'desconfianca', en: 'suspicion' },
  salvadora: { pt: 'salvadora', en: 'rescuer' },
  abandono: { pt: 'abandono', en: 'abandonment' },
  invisibilidade: { pt: 'invisibilidade', en: 'vanishing' }
};

async function readMd(relativePath: string): Promise<{ content: string; data: Record<string, unknown> } | null> {
  const full = path.join(ROOT, relativePath);
  try {
    const raw = await fs.readFile(full, 'utf8');
    const { content, data } = matter(raw);
    return { content, data: data as Record<string, unknown> };
  } catch {
    return null;
  }
}

export async function getCommonSession(locale: Locale, n: 1 | 2 | 6 | 7) {
  const file = `${locale}/sessao-0${n}.md`;
  return readMd(file);
}

export async function getKnotSession(locale: Locale, no: No, n: 3 | 4 | 5) {
  const folder = KNOT_FOLDER[no][locale];
  const file = `${locale}/${KNOT_DIR[locale]}/${folder}/sessao-0${n}.md`;
  return readMd(file);
}

export async function getKnotPractices(locale: Locale, no: No) {
  const folder = KNOT_FOLDER[no][locale];
  const file = `${locale}/${PRACTICE_DIR[locale]}/${folder}/index.md`;
  return readMd(file);
}

export async function getSession(locale: Locale, no: No, n: number) {
  if (n === 1 || n === 2 || n === 6 || n === 7) {
    return getCommonSession(locale, n);
  }
  if (n === 3 || n === 4 || n === 5) {
    return getKnotSession(locale, no, n);
  }
  return null;
}

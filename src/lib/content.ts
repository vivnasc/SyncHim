import matter from 'gray-matter';
import type { Locale, No } from './diagnostic';

import ptSessao01 from '@content/pt/sessao-01.md';
import ptSessao02 from '@content/pt/sessao-02.md';
import ptSessao06 from '@content/pt/sessao-06.md';
import ptSessao07 from '@content/pt/sessao-07.md';
import ptFomeSessao03 from '@content/pt/nos/fome/sessao-03.md';
import ptFomeSessao04 from '@content/pt/nos/fome/sessao-04.md';
import ptFomeSessao05 from '@content/pt/nos/fome/sessao-05.md';
import ptFomePraticas from '@content/pt/praticas/fome/index.md';
import ptLegalGarantia from '@content/pt/legal/garantia.md';
import ptLegalPrivacidade from '@content/pt/legal/privacidade.md';
import ptLegalTermos from '@content/pt/legal/termos.md';

import enSessao01 from '@content/en/sessao-01.md';
import enSessao02 from '@content/en/sessao-02.md';
import enSessao06 from '@content/en/sessao-06.md';
import enSessao07 from '@content/en/sessao-07.md';
import enHungerSessao03 from '@content/en/knots/hunger/sessao-03.md';
import enHungerSessao04 from '@content/en/knots/hunger/sessao-04.md';
import enHungerSessao05 from '@content/en/knots/hunger/sessao-05.md';
import enHungerPractices from '@content/en/practices/hunger/index.md';
import enLegalGarantia from '@content/en/legal/garantia.md';
import enLegalPrivacidade from '@content/en/legal/privacidade.md';
import enLegalTermos from '@content/en/legal/termos.md';

const COMMON_SESSIONS: Record<Locale, Record<1 | 2 | 6 | 7, string>> = {
  pt: { 1: ptSessao01, 2: ptSessao02, 6: ptSessao06, 7: ptSessao07 },
  en: { 1: enSessao01, 2: enSessao02, 6: enSessao06, 7: enSessao07 }
};

const KNOT_SESSIONS: Partial<Record<No, Record<Locale, Record<3 | 4 | 5, string>>>> = {
  fome: {
    pt: { 3: ptFomeSessao03, 4: ptFomeSessao04, 5: ptFomeSessao05 },
    en: { 3: enHungerSessao03, 4: enHungerSessao04, 5: enHungerSessao05 }
  }
};

const KNOT_PRACTICES: Partial<Record<No, Record<Locale, string>>> = {
  fome: { pt: ptFomePraticas, en: enHungerPractices }
};

export const LEGAL: Record<'garantia' | 'privacidade' | 'termos', Record<Locale, string>> = {
  garantia: { pt: ptLegalGarantia, en: enLegalGarantia },
  privacidade: { pt: ptLegalPrivacidade, en: enLegalPrivacidade },
  termos: { pt: ptLegalTermos, en: enLegalTermos }
};

function parse(raw: string | undefined): { content: string; data: Record<string, unknown> } | null {
  if (!raw) return null;
  const { content, data } = matter(raw);
  return { content, data: data as Record<string, unknown> };
}

export async function getCommonSession(locale: Locale, n: 1 | 2 | 6 | 7) {
  return parse(COMMON_SESSIONS[locale]?.[n]);
}

export async function getKnotSession(locale: Locale, no: No, n: 3 | 4 | 5) {
  return parse(KNOT_SESSIONS[no]?.[locale]?.[n]);
}

export async function getKnotPractices(locale: Locale, no: No) {
  return parse(KNOT_PRACTICES[no]?.[locale]);
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

import type { Locale } from './diagnostic';
import type { Target } from './target';

/**
 * Perguntas reformuladas para o público 'solteira'. Mantêm exactamente
 * o mesmo significado psicológico (mesma mecânica de scoring) que as
 * questões originais 'casada', mas com cenários adequados a quem ainda
 * está a tentar construir um relacionamento, em vez de manter um.
 *
 * Mapeamento mecânico:
 *   q1-q3   → Fome           (precisar que o outro preencha)
 *   q4-q6   → Controlo       (gerir tudo, decidir por ambos)
 *   q7-q9   → Inferioridade  (achar-se menos, engolir)
 *   q10-q12 → Desconfiança   (esperar traição/abandono)
 *   q13-q15 → Salvadora      (ver potencial, fazer pelo outro)
 *   q16-q18 → Abandono       (sabotar bem, criar distância)
 *   q19-q21 → Invisibilidade (esvaziar-se, não se atender)
 */
export const QUESTIONS_PT_SOLTEIRA: Record<string, string> = {
  q1: 'Quando ele demora a responder a uma mensagem, eu revejo a conversa para perceber o que disse de errado.',
  q2: 'Quando há silêncio entre nós, eu sinto necessidade de quebrar o silêncio.',
  q3: 'O meu humor do dia depende muito de ele ter ou não falado comigo.',
  q4: 'Logo nas primeiras semanas, percebo melhor do que ele o que ele precisa de fazer da vida.',
  q5: 'Já desisti de esperar que ele tome a iniciativa e prefiro tomar eu, é mais rápido.',
  q6: 'Quando ele toma uma decisão sobre nós sem me consultar, sinto-me desrespeitada.',
  q7: 'Sinto que ele podia ter alguém melhor do que eu.',
  q8: 'Engulo coisas que me magoam para não criar problema logo no início.',
  q9: 'Quando ele me elogia, custa-me acreditar que é a sério.',
  q10: 'Já procurei o que ele faz nas redes ou stalkei o telemóvel quando deu.',
  q11: 'Quando ele demora a aparecer ou a responder, eu imagino cenários antes de ele chegar.',
  q12: 'Acredito que a maioria dos homens, mais cedo ou mais tarde, decepciona.',
  q13: 'Eu vejo nele um potencial que ele próprio ainda não vê.',
  q14: 'Faço por ele (ou pela relação) coisas que ele devia estar a fazer sozinho.',
  q15: 'Se ele estivesse bem sem mim, eu sentir-me-ia menos necessária.',
  q16: 'Tenho medo, mesmo nos bons momentos, de que ele desapareça um dia.',
  q17: 'Já criei distância de propósito antes que ele criasse.',
  q18: 'Quando ele recua um pouco, eu já estou a preparar-me para o fim.',
  q19: 'Já não sei dizer o que gosto de fazer fora de procurar ou pensar em relação.',
  q20: 'Sinto-me invisível para os homens que me interessam, e invisível para mim própria.',
  q21: 'Espero atenção de fora, mas eu própria já não me dou atenção há anos.'
};

export const QUESTIONS_EN_SOLTEIRA: Record<string, string> = {
  q1: 'When he takes long to reply, I replay the conversation to figure out what I said wrong.',
  q2: 'When there is silence between us, I feel the need to break it.',
  q3: 'My mood for the day depends a lot on whether he has reached out or not.',
  q4: 'Within weeks I already know what he needs to do with his life better than he does.',
  q5: 'I have given up waiting for him to take initiative and prefer to do it myself, it is faster.',
  q6: 'When he makes a decision about us without consulting me, I feel disrespected.',
  q7: 'I feel he could have someone better than me.',
  q8: 'I swallow things that hurt me so as not to create a problem early on.',
  q9: 'When he compliments me, it is hard for me to believe he means it.',
  q10: 'I have checked his social media or his phone in secret when I could.',
  q11: 'When he takes long to show up or reply, I imagine scenarios before he arrives.',
  q12: 'I believe most men, sooner or later, disappoint.',
  q13: 'I see in him a potential he does not yet see in himself.',
  q14: 'I do for him (or for the relationship) things he should be doing on his own.',
  q15: 'If he were fine without me, I would feel less needed.',
  q16: 'I fear, even in good moments, that he will disappear one day.',
  q17: 'I have created distance on purpose before he could.',
  q18: 'When he pulls away a little, I am already preparing for the end.',
  q19: 'I can no longer say what I like to do outside of searching for or thinking about a relationship.',
  q20: 'I feel invisible to the men I want, and invisible to myself.',
  q21: 'I wait for attention from outside, but I haven’t paid attention to myself in years.'
};

import { QUESTIONS_PT, QUESTIONS_EN } from './diagnostic';

export function questionMapFor(locale: Locale, target: Target): Record<string, string> {
  if (target === 'solteira') {
    return locale === 'pt' ? QUESTIONS_PT_SOLTEIRA : QUESTIONS_EN_SOLTEIRA;
  }
  return locale === 'pt' ? QUESTIONS_PT : QUESTIONS_EN;
}

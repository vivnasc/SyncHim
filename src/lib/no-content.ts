import type { No, Locale } from './diagnostic';

export interface NoContent {
  essence: string;
  origem: string;
  custo?: string;
  travessia?: string;
}

const PT: Record<No, NoContent> = {
  fome: {
    essence: 'É a fome de sinal. É olhar para o ecrã antes de o telemóvel vibrar.',
    origem:
      'A Fome aparece quando aprendeste, algures na tua vida, que a ligação era escassa — que tinhas de a vigiar para a garantir. Os teus pais, um primeiro afecto, um silêncio que se prolongou demais. Algures, a tua atenção tornou-se um radar. Nunca mais o desligaste.\n\nPor isso, agora, no teu casamento, não consegues estar em paz quando ele está calado. Não porque ele esteja a fazer algo — porque o silêncio te lembra de outra coisa. E reages a essa outra coisa, sem saberes.',
    custo:
      'É a Fome que faz o teu marido sentir o teu olhar antes mesmo de te ver. É ela que põe peso em cada mensagem dele — porque tu lê-la cinco vezes, e ele percebe, sem saber como, que está a ser lido cinco vezes. Então escreve menos. Não porque te despreza. Porque a tua Fome lhe pesa.\n\nEle afasta-se para respirar. Tu sentes o afastamento. E a Fome aumenta. Este é o ciclo. Não é culpa tua que exista. É da tua responsabilidade agora que o vês.',
    travessia:
      'Não se dissolve uma Fome com força de vontade. Dissolve-se mostrando-lhe que já não precisa de estar acordada. As cinco sessões seguintes fazem isso, uma camada de cada vez. Cada uma abre três dias depois da anterior. Não há como acelerar.'
  },
  controlo: {
    essence: 'É o cansaço de quem se tornou a gestora do próprio casamento.',
    origem:
      'O Controlo aparece quando, em algum momento, sentiste que se não fosses tu a tratar de tudo, ninguém o faria. Talvez tivesses razão. Mas o que era necessidade tornou-se hábito — e o hábito tornou-se a forma como o teu marido te vê, e como tu te vês a ti.'
  },
  inferioridade: {
    essence: 'É a sensação, por baixo de tudo, de que ele te aceitou apesar de algo em ti.',
    origem:
      'A Inferioridade não nasceu com ele. Nasceu antes. Algures, alguém te disse — em palavras ou em silêncio — que tu não eras o suficiente. Cresceste a procurar provas de que sim, e a guardar todas as provas do contrário. Trouxeste isso para o casamento, e agora medes o amor dele pela mesma régua antiga.'
  },
  desconfianca: {
    essence: 'É a certeza, sob a pele, de que ele te vai trair se baixares a guarda.',
    origem:
      'A Desconfiança raramente é sobre ele. É sobre o que aprendeste antes dele — em traições reais, em histórias contadas, em pais que se mentiram em frente a ti. Por isso vigias, mesmo quando ele não te dá razões. E quanto mais vigias, mais ele recolhe — não para esconder algo, mas para se proteger de ser tratado como suspeito.'
  },
  salvadora: {
    essence: 'É amá-lo pelo que ele podia ser, e não pelo que é hoje.',
    origem:
      'A Salvadora aparece em mulheres que aprenderam, cedo, que o amor se ganha pelo cuidado — que se tornavam indispensáveis e por isso seriam mantidas. Trouxeste isso para o casamento sem dares por isso. Vês potencial nele que ele próprio não vê. A tua vida tornou-se construir-lhe esse potencial. Enquanto isso, a tua deixou de ser construída por ninguém.'
  },
  abandono: {
    essence: 'É a antecipação do fim, mesmo nos bons momentos.',
    origem:
      'O Abandono é o nó das que já perderam — um pai, uma mãe, um primeiro amor que se foi sem aviso. Aprendeste cedo que a saída era inevitável, e que era melhor estar preparada. Por isso, mesmo quando o teu marido te ama, uma parte tua está a contar os dias até ele ir. E essa parte às vezes age primeiro: afasta antes de ser afastada.'
  },
  invisibilidade: {
    essence: 'É já não te lembrares de quem eras antes de seres esposa e mãe.',
    origem:
      'A Invisibilidade não foi uma escolha. Foi um desgaste. Aos poucos, deste tudo o que tinhas — tempo, atenção, espaço, prazer. Pensaste que era amor. E era. Mas ninguém te disse que o amor que se dá inteiro deixa de te ver. Hoje sentes-te invisível dentro da tua casa, e o pior é que tens razão. Não porque eles sejam cegos. Porque tu desapareceste para te dares.'
  }
};

const EN: Record<No, NoContent> = {
  fome: {
    essence: 'It is the hunger for a signal. It is checking the screen before the phone has buzzed.',
    origem:
      'Hunger appears when you learned, somewhere in your life, that connection was scarce — that you had to watch for it in order to keep it. Your parents, an early love, a silence that went on too long. Somewhere, your attention became a radar. You never turned it off.\n\nSo now, in your marriage, you cannot be still when he is quiet. Not because he is doing anything — because the silence reminds you of something else. And you react to that something else, without knowing.',
    custo:
      'Hunger is what makes your husband feel your eyes on him before he sees you. It is what gives weight to every message he sends — because you read it five times, and he senses, without knowing how, that he is being read five times. So he writes less. Not because he disregards you. Because your hunger weighs on him.\n\nHe pulls away to breathe. You feel him pulling away. And the hunger grows. This is the loop. It is not your fault that it exists. It is your responsibility now that you see it.',
    travessia:
      "You don't dissolve a hunger by willpower. You dissolve it by showing it it doesn't need to be awake anymore. The next five sessions do exactly that, one layer at a time. Each opens three days after the one before. There is no way to speed it up."
  },
  controlo: {
    essence: 'It is the tiredness of the woman who became the manager of her own marriage.',
    origem:
      'Grip appears when, at some point, you felt that if you did not handle everything, no one would. Perhaps you were right then. But what was necessity became habit — and the habit became how your husband sees you, and how you see yourself.'
  },
  inferioridade: {
    essence: 'It is the sense, under everything, that he accepted you in spite of something in you.',
    origem:
      "Smallness was not born with him. It was born before. Somewhere, someone told you — in words or in silence — that you were not enough. You grew up looking for proof that you were, and keeping every proof that you weren't. You brought it into the marriage, and now you measure his love by that same old ruler."
  },
  desconfianca: {
    essence: "It is the certainty, under the skin, that he will betray you if you lower your guard.",
    origem:
      'Suspicion is rarely about him. It is about what you learned before him — in real betrayals, in stories told, in parents who lied to each other in front of you. So you watch, even when he gives you no reason. And the more you watch, the more he withdraws — not to hide something, but to protect himself from being treated as a suspect.'
  },
  salvadora: {
    essence: 'It is loving him for what he could be, not for what he is today.',
    origem:
      'The Rescuer appears in women who learned, early, that love is earned through care — that becoming indispensable was how to be kept. You brought this into your marriage without noticing. You see in him a potential he himself does not see. Your life became building that potential for him. Meanwhile, yours stopped being built by anyone.'
  },
  abandono: {
    essence: 'It is anticipating the end, even in good moments.',
    origem:
      'Abandonment is the knot of women who have already lost — a father, a mother, a first love who left without warning. You learned early that leaving was inevitable, and that it was better to be ready. So even when your husband loves you, a part of you is counting the days until he goes. And that part sometimes acts first: it pulls away before being pulled away from.'
  },
  invisibilidade: {
    essence: 'It is no longer remembering who you were before you were a wife and a mother.',
    origem:
      'Vanishing was not a choice. It was a wearing-down. Slowly, you gave everything you had — time, attention, space, pleasure. You thought it was love. It was. But no one told you that love given whole stops seeing you. Today you feel invisible inside your own home, and the worst part is that you are right. Not because they are blind. Because you disappeared in order to give.'
  }
};

export function noContent(locale: Locale, no: No): NoContent {
  return (locale === 'pt' ? PT : EN)[no];
}

import type { No, Locale } from './diagnostic';

export interface NoContent {
  /** First-paragraph hook, also used as essence one-liner. */
  lead: string;
  /** Remaining body paragraphs (4 more, descending in length). */
  body: string[];
  /** Single italic line, the punch. */
  fraseQueDoi: string;
  /** Optional intro to the paid crossing. */
  travessia?: string;
}

const PT: Record<No, NoContent> = {
  fome: {
    lead: 'Tu precisas que ele te preencha.',
    body: [
      'Não é amor. É fome. Aprendeste, muito cedo, que a presença de outro alguém é o que te mantém de pé. Por isso, quando ele está atento, tu respiras. Quando ele se afasta um milímetro, tu sufocas.',
      'Vives em vigilância. Lês o tom da voz dele de manhã para saber como vai ser o teu dia. Recompões a conversa de ontem para perceber se ele estava chateado. Quando ele demora a responder, tu já passaste por três cenários antes de ele responder.',
      'Não estás louca. Estás faminta. E a fome não tem culpa, tem origem. Vem de antes do teu marido.',
      'Mas a fome esgota-o. Não porque ele é fraco. Porque corpos próximos cansam de carregar fome alheia.'
    ],
    fraseQueDoi:
      'O teu casamento não está a morrer porque ele esfriou. Está a morrer porque a tua fome esgotou-o.',
    travessia:
      'Não se dissolve este nó com força de vontade. Dissolve-se mostrando-lhe que já não precisa de estar acordado. As cinco sessões seguintes fazem isso, uma camada de cada vez. Cada uma abre três dias depois da anterior. Não há como acelerar.'
  },
  controlo: {
    lead: 'Tu geres tudo.',
    body: [
      'A casa, os filhos, a agenda dele, o que ele veste para o evento da tua mãe. Dizes que é porque tem de ser feito, porque ele não percebe, porque mais vale ser tu. Em parte, é verdade.',
      'A outra parte, que ninguém te ensinou a ver, é que controlar é o único modo que conheces de te sentires segura.',
      'Ele desistiu de propor. De decidir. De aparecer com ideias. Aprendeu, ao longo de anos, que tu já decidiste antes dele abrir a boca. Por isso já não tenta.',
      'E o que tu sentes como "ele virou criança" é a consequência de te teres tornado a mãe que ele nunca pediu para ter.'
    ],
    fraseQueDoi:
      'Não o estás a sufocar por seres má. Estás a sufocá-lo por nunca te terem ensinado que se pode confiar sem controlar.'
  },
  inferioridade: {
    lead: 'Tu achas-te menos.',
    body: [
      'Menos bonita do que devias. Menos interessante do que ele merece. Menos jovem do que outras que ele encontra. Vives a tentar compensar. Engoles. Sorris quando devias falar. Aceitas o que te magoa para não criar problema.',
      'Por dentro, tens uma lista de injustiças que nunca disseste. Por fora, és a mulher fácil de viver com.',
      'E ele, sem perceber, porque os homens raramente percebem isto, perde respeito por ti em silêncio. Não te diz. Apenas se afasta para um lugar interior onde tu já não tens entrada.',
      'Os homens não desejam quem se apaga para servir. Não é injustiça. É como sistemas humanos funcionam.'
    ],
    fraseQueDoi:
      'Tu não estás a ser punida. Estás a ser tratada como a mulher que tu te apresentas como sendo.'
  },
  desconfianca: {
    lead: 'Tu esperas traição.',
    body: [
      'Sempre. Em todos. Mesmo neste, que talvez não dê motivos. Tu vigias. Lês mensagens. Inventas cenários. Quando ele se atrasa, já viajaste três infidelidades na cabeça antes de ele chegar.',
      'Não és paranóica. Tu sabes ler pessoas. O que tu não sabes ler é a tua própria história a falar por trás do que vês.',
      'Ele sente-se preso. Vigiado. Culpado de coisas que não fez, com olhares que tu lhe mandas sem perceberes. Aos poucos, foi-se retirando. E retirar-se confirma, para ti, que ele tinha algo a esconder.',
      'Mas o que ele estava a esconder era apenas o cansaço de ser visto como criminoso de uma traição que nunca cometeu.'
    ],
    fraseQueDoi:
      'O teu nó não é ele ser pouco confiável. É tu carregares uma traição antiga que ainda não foi vista.'
  },
  salvadora: {
    lead: 'Tu vê-lo como projecto.',
    body: [
      'Há uma versão dele, mais leve, mais segura, mais realizada, que tu vês com tanta clareza que parece que ela já existe. Falta-lhe pouco. Falta-lhe a tua ajuda. A tua orientação. O teu cuidado.',
      'Fazes por ele o que ele devia fazer sozinho. Mandas-lhe artigos. Pagaste-lhe uma terapia que ele não pediu. Falas com a mãe dele para lhe defenderes. Dizes que é amor.',
      'É medo. Medo de que se ele se curar sozinho, deixe de precisar de ti. E sem ser precisa, tu não saberias quem és.',
      'Ele sente-se infantilizado. E homens infantilizados ou se rebelam contra ti, ou se rendem em apatia. Nenhum dos dois te ama de volta como tu querias.'
    ],
    fraseQueDoi:
      'Tu não o amas. Tu precisas de o salvar para não teres que te salvar a ti.'
  },
  abandono: {
    lead: 'Tu tens medo de que ele se vá embora.',
    body: [
      'Sempre. Mesmo nos bons momentos. Sobretudo nos bons momentos, porque o bem, para ti, é só o silêncio antes do fim.',
      'Por antecipar, sabotas. Crias distância antes que ele crie. Punes silêncios dele que não eram sobre ti. Lês frieza onde havia apenas cansaço. Pioras tudo antes do pior poder vir.',
      'Quando ele finalmente se afasta, exausto de ser tratado como traidor de um crime que ainda nem cometeu, tu dizes "eu sabia". E sentes alívio, porque o medo virou facto, e factos doem menos que medos.',
      'Não é a relação. É um abandono antigo que ainda dói, e que está a usar este homem como ensaio do fim que tu já viveste antes.'
    ],
    fraseQueDoi:
      'Tu não tens medo de o perder. Tens medo de descobrir que desta vez não vais perder, e que vais ter de aprender a ficar.'
  },
  invisibilidade: {
    lead: 'Tu desapareceste.',
    body: [
      'Dentro da relação. Dentro da casa. Dentro de ti. Já não sabes dizer o que gostas de fazer fora de ser esposa ou mãe. As tuas amigas perguntam-te como estás e tu respondes contando como estão os teus filhos.',
      'Sentes-te transparente. Atravessas a cozinha e ninguém olha. Falas e a frase fica suspensa no ar. Sentas-te ao lado dele no sofá e a distância entre vocês é maior do que a distância à mãe que tu odeias visitar.',
      'Cobras-lhe atenção. Mas tu própria já não te dás atenção há anos. Não sabes o que cozinhar quando não cozinhas para ele. Não sabes o que ler quando não lês para os miúdos. Não sabes quem és quando não és "a mulher de".',
      'Os homens, todos eles, respondem ao que está vivo. Tu pediste-lhe que visse alguém que tu deixaste de habitar.'
    ],
    fraseQueDoi:
      'Não é que ele tenha deixado de te ver. É que tu deixaste de estar lá para ser vista.'
  }
};

const EN: Record<No, NoContent> = {
  fome: {
    lead: 'You need him to fill you.',
    body: [
      "It isn't love. It's hunger. You learned, very early, that another person's presence is what keeps you upright. So when he's attentive, you breathe. When he pulls away a millimetre, you suffocate.",
      "You live in surveillance. You read his voice in the morning to know what your day will be. You replay yesterday's conversation to find out if he was upset. When he takes long to reply, you've already walked through three scenarios before he answers.",
      "You aren't crazy. You're starving. And the hunger isn't your fault, it has an origin. It comes from before your husband.",
      'But the hunger exhausts him. Not because he is weak. Because nearby bodies tire of carrying another person\'s hunger.'
    ],
    fraseQueDoi:
      "Your marriage isn't dying because he turned cold. It's dying because your hunger exhausted him.",
    travessia:
      "You don't dissolve this knot by willpower. You dissolve it by showing it it doesn't need to be awake anymore. The next five sessions do that, one layer at a time. Each opens three days after the previous one. There is no way to speed it up."
  },
  controlo: {
    lead: 'You manage everything.',
    body: [
      "The house, the children, his calendar, what he wears to your mother's event. You say it's because it has to be done, because he doesn't get it, because better you. In part, that's true.",
      'The other part, that no one taught you to see, is that controlling is the only way you know how to feel safe.',
      'He gave up proposing. Deciding. Arriving with ideas. Over years, he learned that you had already decided before he opened his mouth. So he no longer tries.',
      'And what you feel as "he became a child" is the consequence of you becoming the mother he never asked to have.'
    ],
    fraseQueDoi:
      "You aren't suffocating him because you're bad. You're suffocating him because you were never taught that one can trust without controlling."
  },
  inferioridade: {
    lead: 'You think yourself less.',
    body: [
      "Less beautiful than you should be. Less interesting than he deserves. Less young than others he meets. You spend yourself compensating. You swallow. You smile when you should speak. You accept what hurts to avoid problems.",
      'Inside, you carry a list of injustices you never said out loud. Outside, you are the woman easy to live with.',
      'And he, without knowing it, because men rarely know this, slowly loses respect for you in silence. He does not tell you. He just withdraws to an inner place you no longer have entry to.',
      'Men do not desire what erases itself to serve. It isn\'t injustice. It is how human systems work.'
    ],
    fraseQueDoi:
      "You aren't being punished. You're being treated as the woman you present yourself to be."
  },
  desconfianca: {
    lead: 'You expect betrayal.',
    body: [
      "Always. In everyone. Even in this one, who maybe gives you no reason. You watch. You read messages. You invent scenarios. When he's late, you've already travelled three infidelities in your head before he arrives.",
      "You aren't paranoid. You know how to read people. What you don't know how to read is your own history speaking behind what you see.",
      'He feels trapped. Watched. Guilty of things he did not do, with looks you send without knowing. Bit by bit, he withdrew. And withdrawing confirmed, for you, that he had something to hide.',
      'But what he was hiding was only the tiredness of being treated as a criminal of a betrayal he never committed.'
    ],
    fraseQueDoi:
      "Your knot is not that he is unreliable. It is that you carry an old betrayal that has not yet been seen."
  },
  salvadora: {
    lead: 'You see him as a project.',
    body: [
      "There is a version of him, lighter, surer, more realised, that you see so clearly it seems already to exist. He's just missing a little. He's missing your help. Your guidance. Your care.",
      "You do for him what he should do alone. You send him articles. You paid for a therapy he didn't ask for. You speak to his mother to defend him. You call it love.",
      "It's fear. Fear that if he heals on his own, he no longer needs you. And without being needed, you wouldn't know who you are.",
      'He feels infantilised. And infantilised men either rebel against you, or surrender into apathy. Neither loves you back the way you wanted.'
    ],
    fraseQueDoi:
      "You don't love him. You need to save him so you don't have to save yourself."
  },
  abandono: {
    lead: 'You are afraid he will leave.',
    body: [
      'Always. Even in good moments. Especially in good moments, because for you, well-being is just the silence before the end.',
      'By anticipating, you sabotage. You create distance before he does. You punish his silences that were not about you. You read coldness where there was only tiredness. You worsen everything before the worst can come.',
      'When he finally pulls away, exhausted from being treated as the traitor of a crime not yet committed, you say "I knew it". And you feel relief, because fear became fact, and facts hurt less than fears.',
      "It is not the relationship. It is an old abandonment still aching, using this man as the rehearsal of an ending you've already lived."
    ],
    fraseQueDoi:
      "You are not afraid of losing him. You are afraid of discovering that this time you won't lose, and that you will have to learn how to stay."
  },
  invisibilidade: {
    lead: 'You disappeared.',
    body: [
      "Inside the relationship. Inside the house. Inside yourself. You can no longer say what you enjoy doing outside of being a wife or mother. Your friends ask how you are and you answer telling them about your children.",
      'You feel transparent. You walk through the kitchen and no one looks. You speak and the sentence stays suspended in the air. You sit beside him on the sofa and the distance between you is greater than the distance to the mother you hate to visit.',
      "You demand his attention. But you haven't given attention to yourself in years. You don't know what to cook when you don't cook for him. You don't know what to read when you don't read for the kids. You don't know who you are when you are not \"the wife of\".",
      'Men, all of them, respond to what is alive. You asked him to see someone you stopped inhabiting.'
    ],
    fraseQueDoi:
      "It is not that he stopped seeing you. It is that you stopped being there to be seen."
  }
};

export function noContent(locale: Locale, no: No): NoContent {
  return (locale === 'pt' ? PT : EN)[no];
}

import type { No, Locale } from './diagnostic';

export type LoveContext = 'casada' | 'sozinha' | 'inicio';
export type ContentContext = 'casada' | 'solteira';

export function toContentContext(c: LoveContext): ContentContext {
  return c === 'casada' ? 'casada' : 'solteira';
}

export interface NoContent {
  lead: string;
  body: string[];
  fraseQueDoi: string;
  travessia?: string;
}

const PT_CASADA: Record<No, NoContent> = {
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

const PT_SOLTEIRA: Record<No, NoContent> = {
  fome: {
    lead: 'Tu precisas que alguém te preencha.',
    body: [
      'E por isso agarras depressa demais. Conheces um homem e em três encontros já estás a imaginar a vida inteira. Já lhe deste um espaço dentro de ti que ele ainda não pediu. Já estás a ler as mensagens dele à procura de sinais de que ele sente o mesmo.',
      'E eles sentem o peso. Não conseguem nomeá-lo, mas sentem. A tua fome chega antes de ti à mesa. E os homens recuam de fomes que não souberam que provocaram.',
      'Tu chamas a isto "ser intensa", "amar demais", "ter o coração grande". Não é. É fome. E a fome não é amor, é uma criança antiga ainda a pedir colo, a usar cada homem novo como possível salvador.',
      'Por isso eles fogem. E cada fuga confirma o teu medo de que não vais ser escolhida. E o medo faz-te agarrar ainda mais depressa no próximo. E o próximo foge mais cedo.'
    ],
    fraseQueDoi:
      'Não é que não apareça ninguém bom. É que a tua fome os assusta antes de eles te conhecerem.',
    travessia:
      'Não se dissolve este nó com força de vontade. Dissolve-se mostrando-lhe que já não precisa de estar acordado. As cinco sessões seguintes fazem isso, uma camada de cada vez. Cada uma abre três dias depois da anterior. Não há como acelerar.'
  },
  controlo: {
    lead: 'Tu filtras toda a gente.',
    body: [
      'Antes do segundo encontro, já sabes tudo o que está errado nele. A forma como ele escreve. O restaurante que ele escolheu. O facto de ele ter chegado três minutos atrasado. Tu chamas a isto "ter critério", "saber o que quero", "não perder tempo".',
      'Em parte, é verdade. Tu mereces critério. A outra parte, que ninguém te ensinou a ver, é que o controlo é a única forma que tu conheces de te sentires segura. E controlar quem entra é a tua forma de garantir que ninguém te apanha desprevenida.',
      'Mas a intimidade não sobrevive ao controlo. Nenhum homem se aproxima de uma mulher que o está a avaliar a cada gesto. Eles sentem o exame. E retraem-se. Ou tu desqualificas-os antes de eles terem hipótese de te mostrar quem são.',
      'Resultado: tu estás sozinha e dizes a ti mesma que é porque "não há homens à altura". Talvez alguns não estejam. Mas alguns estavam, e tu nunca os deixaste chegar perto o suficiente para descobrir.'
    ],
    fraseQueDoi:
      'Não estás sozinha por falta de opções. Estás sozinha porque controlar é mais seguro do que arriscar ser surpreendida.'
  },
  inferioridade: {
    lead: 'Tu achas-te menos.',
    body: [
      'E por isso aceitas migalhas. O homem que só aparece à meia-noite. O que nunca te apresenta a ninguém. O que te trata bem em privado e finge que não te conhece em público. Tu aceitas, porque por dentro acreditas que é o que mereces. Que pedir mais seria pedir demais. Que se tu cobrares, ele vai embora, e alguém é melhor que ninguém.',
      'Tu compensas. Fazes-te útil, fácil, sempre disponível, sempre compreensiva da agenda dele, dos atrasos dele, da indisponibilidade dele. És a mulher de quem é fácil gostar e fácil deixar.',
      'E eles deixam. Não porque tu não vales. Porque tu te apresentaste como alguém que vale pouco, e os homens tratam as mulheres como acreditam que elas acreditam merecer ser tratadas.',
      'A mulher que aceita migalhas ensina o mundo a só lhe dar migalhas. Não é injustiça. É como sistemas humanos funcionam.'
    ],
    fraseQueDoi:
      'Tu não atrais homens indisponíveis por azar. Atrais quem te trata como tu, no fundo, achas que mereces.'
  },
  desconfianca: {
    lead: 'Tu esperas a mentira.',
    body: [
      'Em cada um. Mesmo no que parece bom, sobretudo no que parece bom, porque o bom assusta-te mais. Tu vigias as redes sociais dele antes do terceiro encontro. Tu já sabes o nome das ex. Tu lês duplo sentido em tudo o que ele diz. Quando ele se atrasa a responder, tu já construíste a infidelidade inteira antes dele explicar que estava no trabalho.',
      'Não és paranóica. Tu sabes ler pessoas. O que tu não sabes ler é a tua própria história a falar por trás do que vês.',
      'E eles sentem-se julgados antes de fazerem nada. Sentem que estão a pagar por crimes de homens que vieram antes. E recuam, porque ninguém quer começar uma relação já como suspeito.',
      'Tu vês o recuo deles como prova de que tinhas razão em desconfiar. Mas o que os afastou não foi culpa. Foi o cansaço de serem vigiados por algo que não fizeram.'
    ],
    fraseQueDoi:
      'O homem que tu procuras não vai conseguir provar que é de confiança. Porque o teu nó não é ele. É uma traição antiga que ainda não foi vista.'
  },
  salvadora: {
    lead: 'Tu apaixonas-te por projectos.',
    body: [
      'O homem com potencial. O que "só precisa de alguém que acredite nele". O talentoso mas perdido. O ferido que tu vais curar. O que tem tudo para ser incrível, falta-lhe só, a tua ajuda.',
      'Tu não te apaixonas por homens prontos. Aborrecem-te. Um homem que já se resolveu não precisa de ti, e sem seres precisa, tu não sabes o que fazer com o amor. Por isso escolhes sempre os que faltam, os que precisam, os que tu podes consertar.',
      'E depois esgotas-te. Dás conselhos que ele não pediu. Pagas coisas que devias deixá-lo pagar. Investes neles mais do que eles em ti. E quando eles finalmente crescem, ou quando percebem que não querem ser projecto de ninguém, vão-se embora. Muitas vezes para outra, que apanha o homem que tu construíste.',
      'Tu não amas estes homens. Tu precisas de os salvar. Porque salvar é a única forma que conheces de ser indispensável. E ser indispensável é a única forma que conheces de não ser abandonada.'
    ],
    fraseQueDoi:
      'Tu não escolhes homens errados por azar. Escolhe-los porque um homem inteiro não precisaria de ti, e isso aterroriza-te.'
  },
  abandono: {
    lead: 'Tu acabas tudo antes que acabem contigo.',
    body: [
      'Há sempre um momento, por volta do terceiro mês, às vezes antes, em que as coisas estão bem demais. E é aí que tu sabotas. Inventas um problema. Encontras um defeito que não te incomodava. Crias distância. Ou simplesmente desapareces, dizendo a ti mesma que "não era para ser".',
      'Tu chamas a isto "ter standards" ou "perceber a tempo que não dava". A verdade é mais difícil: tu foges antes de te apegares ao ponto de poderes ser deixada. Porque ser deixada, isso tu já viveste, há muito tempo, e juraste nunca mais.',
      'Por antecipar a perda, tu garantes a perda. Crias a solidão que tanto temes, mas pelo menos é uma solidão que tu controlas. Dói menos ser tu a partir do que esperar que partam.',
      'E há o oposto: às vezes agarras com tal pânico que sufocas o homem antes de ele ter espaço para ficar. Os dois extremos vêm do mesmo medo. Os dois produzem o mesmo fim.'
    ],
    fraseQueDoi:
      'Tu não estás sozinha porque ninguém fica. Estás sozinha porque tu vais embora primeiro, para não teres de aprender a confiar que alguém poderia ficar.'
  },
  invisibilidade: {
    lead: 'Tu não sabes o que queres.',
    body: [
      'Quando um homem te pergunta do que tu gostas, o que tu queres fazer, quem tu és, tu hesitas. Adaptas-te ao que ele parece querer. Tornas-te a mulher que combina com cada um. Com o intelectual, ficas profunda. Com o desportista, ficas activa. Com o artista, ficas livre. E em cada um, desapareces um pouco mais.',
      'Tu não tens, hoje, uma vida que seja inconfundivelmente tua. Não há nada que faça alguém dizer "isto é tão a tua cara". Porque tu nunca construíste uma cara própria, passaste a vida a ser o reflexo do que os outros precisavam.',
      'E os homens, todos eles, apaixonam-se pelo que está vivo, pelo que tem contorno, pelo que é inconfundível. Tu ofereces-lhes um espelho, não uma mulher. E é difícil apaixonar-se por um espelho. Confortável, sim. Apaixonante, não.',
      'Por isso tu és a amiga, a opção segura, a que fica em stand-by. Raramente a escolhida. Não porque não vales, porque não há, ainda, uma tu inteira para escolher.'
    ],
    fraseQueDoi:
      'Tu não passas despercebida porque não és suficiente. Passas despercebida porque ainda não decidiste quem és, e ninguém se apaixona por uma decisão adiada.'
  }
};

// English mirrors. Translated to keep the same cadence and meaning.

const EN_CASADA: Record<No, NoContent> = {
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
      "Men do not desire what erases itself to serve. It isn't injustice. It is how human systems work."
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

const EN_SOLTEIRA: Record<No, NoContent> = {
  fome: {
    lead: 'You need someone to fill you.',
    body: [
      "So you grab too fast. You meet a man and three dates in you're already imagining a whole life. You've already given him a space inside you that he hasn't asked for. You're already reading his messages for signs that he feels the same.",
      "And they feel the weight. They can't name it, but they feel it. Your hunger arrives at the table before you do. And men back away from a hunger they didn't know they caused.",
      "You call this 'being intense', 'loving too much', 'having a big heart'. It isn't. It's hunger. And hunger isn't love, it's an old child still asking to be held, using each new man as a possible saviour.",
      'So they leave. And every leaving confirms your fear that you will not be chosen. And the fear makes you grab even faster at the next one. And the next one leaves sooner.'
    ],
    fraseQueDoi:
      "It isn't that no good one shows up. It's that your hunger scares them before they get to know you.",
    travessia:
      "You don't dissolve this knot by willpower. You dissolve it by showing it it doesn't need to be awake anymore. The next five sessions do that, one layer at a time. Each opens three days after the previous one. There is no way to speed it up."
  },
  controlo: {
    lead: 'You filter everyone out.',
    body: [
      "Before the second date, you already know everything wrong with him. The way he writes. The restaurant he chose. The fact that he arrived three minutes late. You call this 'having standards', 'knowing what I want', 'not wasting time'.",
      'In part, it is true. You deserve standards. The other part, that no one taught you to see, is that control is the only way you know how to feel safe. And controlling who enters is your way of guaranteeing no one catches you unprepared.',
      'But intimacy does not survive control. No man comes close to a woman who is evaluating him at every gesture. They sense the exam. And they pull back. Or you disqualify them before they have a chance to show you who they are.',
      "The result: you are alone and tell yourself it's because 'there are no men at my level'. Maybe some aren't. But some were, and you never let them come close enough to find out."
    ],
    fraseQueDoi:
      'You are not alone for lack of options. You are alone because controlling is safer than risking being surprised.'
  },
  inferioridade: {
    lead: 'You think yourself less.',
    body: [
      "So you accept crumbs. The man who only shows up at midnight. The one who never introduces you to anyone. The one who treats you well in private and pretends not to know you in public. You accept, because deep down you believe it's what you deserve. That asking for more would be asking too much. That if you demand, he leaves, and someone is better than no one.",
      'You compensate. You make yourself useful, easy, always available, always understanding of his calendar, his lateness, his unavailability. You are the woman easy to like and easy to leave.',
      "And they leave. Not because you have no worth. Because you presented yourself as someone of little worth, and men treat women as they believe the women believe they deserve to be treated.",
      "The woman who accepts crumbs teaches the world to give her only crumbs. It isn't injustice. It is how human systems work."
    ],
    fraseQueDoi:
      "You don't attract unavailable men by chance. You attract whoever treats you the way you, deep down, think you deserve."
  },
  desconfianca: {
    lead: 'You expect the lie.',
    body: [
      "In each one. Even in what seems good, especially in what seems good, because the good scares you more. You watch his social media before the third date. You already know the names of the exes. You read double meaning into everything he says. When he's slow to reply, you've already built the entire infidelity before he explains he was at work.",
      "You aren't paranoid. You know how to read people. What you don't know how to read is your own history speaking behind what you see.",
      'And they feel judged before they do anything. They feel they are paying for crimes of men who came before. And they pull back, because no one wants to start a relationship as a suspect.',
      'You see their pulling back as proof that you were right to mistrust. But what pushed them away was not guilt. It was the tiredness of being watched for something they did not do.'
    ],
    fraseQueDoi:
      "The man you are looking for will not be able to prove he is trustworthy. Because your knot is not him. It is an old betrayal that has not yet been seen."
  },
  salvadora: {
    lead: 'You fall in love with projects.',
    body: [
      "The man with potential. The one who 'just needs someone who believes in him'. The talented but lost one. The wounded one you will heal. The one who has it all to be amazing, he's just missing, your help.",
      "You don't fall in love with finished men. They bore you. A man who has resolved himself doesn't need you, and without being needed, you don't know what to do with love. So you always choose the ones missing something, the ones who need, the ones you can fix.",
      "And then you exhaust yourself. You give advice he didn't ask for. You pay for things you should let him pay. You invest in them more than they in you. And when they finally grow, or when they realise they don't want to be anyone's project, they leave. Often for another woman, who gets the man you built.",
      'You do not love these men. You need to save them. Because saving is the only way you know how to be indispensable. And being indispensable is the only way you know how not to be abandoned.'
    ],
    fraseQueDoi:
      "You don't choose the wrong men by chance. You choose them because a whole man wouldn't need you, and that terrifies you."
  },
  abandono: {
    lead: 'You end things before they end with you.',
    body: [
      "There is always a moment, around the third month, sometimes earlier, when things are too good. And that is when you sabotage. You invent a problem. You find a flaw that didn't bother you. You create distance. Or you simply disappear, telling yourself 'it wasn't meant to be'.",
      "You call this 'having standards' or 'realising in time that it wasn't going to work'. The truth is harder: you flee before you attach to the point of being able to be left. Because being left, that you have already lived, a long time ago, and you swore never again.",
      'By anticipating loss, you guarantee loss. You create the loneliness you fear, but at least it is a loneliness you control. It hurts less to be the one leaving than to wait for them to leave.',
      'And there is the opposite: sometimes you grip with such panic that you suffocate the man before he has space to stay. Both extremes come from the same fear. Both produce the same ending.'
    ],
    fraseQueDoi:
      "You are not alone because no one stays. You are alone because you go first, so you don't have to learn to trust that someone could have stayed."
  },
  invisibilidade: {
    lead: "You don't know what you want.",
    body: [
      "When a man asks you what you like, what you want to do, who you are, you hesitate. You adapt to what he seems to want. You become the woman who matches each one. With the intellectual, you go deep. With the athlete, you go active. With the artist, you go free. And in each one, you disappear a little more.",
      'You do not, today, have a life that is unmistakably yours. There is nothing that would make someone say "this is so you". Because you never built a face of your own, you spent your life being the reflection of what others needed.',
      'And men, all of them, fall in love with what is alive, what has contour, what is unmistakable. You offer them a mirror, not a woman. And it is hard to fall in love with a mirror. Comfortable, yes. Captivating, no.',
      "So you are the friend, the safe option, the one on stand-by. Rarely the chosen one. Not because you have no worth, because there isn't, yet, a whole you to be chosen."
    ],
    fraseQueDoi:
      "You don't go unnoticed because you aren't enough. You go unnoticed because you haven't yet decided who you are, and no one falls in love with a decision postponed."
  }
};

export function noContent(locale: Locale, no: No, context: ContentContext = 'casada'): NoContent {
  const map = locale === 'pt'
    ? (context === 'solteira' ? PT_SOLTEIRA : PT_CASADA)
    : (context === 'solteira' ? EN_SOLTEIRA : EN_CASADA);
  return map[no];
}

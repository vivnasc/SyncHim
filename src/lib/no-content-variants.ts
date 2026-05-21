import type { No, Locale } from './diagnostic';
import type { Target } from './target';
import { noContent as baseContent } from './no-content';

/**
 * Overrides do conteúdo dos 7 nós para o público 'solteira'. Reescreve
 * `lead`, `body` e `fraseQueDoi` mantendo a mecânica psicológica
 * idêntica; o que muda é o cenário (chats que esfriam, escolhas
 * repetidas, recuos) em vez de marido/casa/filhos.
 *
 * Os textos abaixo são suficientes para o resultado do Tier 0. O Tier 1
 * (sessões 3-7 pagas) ainda usa a versão 'casada' nesta primeira
 * iteração; alargar é editorial e fica para a próxima onda de copy.
 */

type Variant = {
  lead: string;
  body: string[];
  fraseQueDoi: string;
  travessia?: string;
};

const PT_SOLTEIRA: Record<No, Variant> = {
  fome: {
    lead: 'Tu precisas que alguém te preencha.',
    body: [
      'Não é amor. É fome. Aprendeste, muito cedo, que a atenção de outro alguém é o que te mantém de pé. Por isso, quando ele aparece, tu respiras. Quando se afasta um milímetro, tu sufocas.',
      'Vives em vigilância. Lês o tom da última mensagem. Recompões a conversa para perceber se ele estava distante. Quando ele demora a responder, tu já viajaste por três cenários antes de ele responder.',
      'Não estás louca. Estás faminta. E a fome não tem culpa, tem origem, vem de antes de qualquer relação tua.',
      'Mas a fome esgota quem chega perto. Não porque eles sejam fracos. Porque corpos próximos cansam de carregar fome alheia.'
    ],
    fraseQueDoi:
      'Os homens não se afastam porque não te merecem. Afastam-se porque a tua fome os esgota antes de te conhecerem.',
    travessia:
      'Não se dissolve este nó com força de vontade nem com técnicas de "energia feminina". Dissolve-se mostrando ao teu próprio sistema que já não precisa de ninguém acordado para se sentir seguro. As cinco sessões seguintes fazem isso, uma camada de cada vez. Cada uma abre três dias depois da anterior.'
  },
  controlo: {
    lead: 'Tu geres tudo.',
    body: [
      'A tua agenda, a vida dele, o que devia acontecer entre vocês daqui a três meses. Dizes que é porque tens objectivos, porque ele é mais lento, porque mais vale ser tu. Em parte, é verdade.',
      'A outra parte, que ninguém te ensinou a ver, é que controlar é o único modo que conheces de te sentires segura quando outro ser humano se aproxima.',
      'Os homens que te interessam desistem de propor. Aprendem, em poucas semanas, que tu já decidiste antes deles abrirem a boca. Por isso já não tentam.',
      'E o que tu sentes como "ele virou passivo" é a consequência de te teres tornado a planeadora de uma relação que ele nunca pediu para ter ainda.'
    ],
    fraseQueDoi:
      'Não os estás a afastar por seres má. Estás a afastá-los por nunca te terem ensinado que se pode confiar sem controlar.'
  },
  inferioridade: {
    lead: 'Tu achas-te menos.',
    body: [
      'Menos bonita do que devias. Menos interessante. Menos jovem do que outras. Quando alguém aparece, tens a certeza tácita de que ele há-de descobrir, mais cedo ou mais tarde. Por isso engoles. Sorris quando devias falar. Aceitas o que te magoa para não criar problema.',
      'Por dentro, tens uma lista de injustiças que nunca disseste. Por fora, és a mulher fácil de viver com.',
      'E os homens, sem perceber, porque raramente percebem isto, perdem respeito por ti em silêncio. Não te dizem. Apenas se afastam para um lugar onde tu já não tens entrada.',
      'Os homens não desejam quem se apaga para servir. Não é injustiça. É como sistemas humanos funcionam.'
    ],
    fraseQueDoi:
      'Tu não estás a ser punida. Estás a ser tratada como a mulher que tu te apresentas como sendo.'
  },
  desconfianca: {
    lead: 'Tu esperas que ele te decepcione.',
    body: [
      'Sempre. Em todos. Mesmo neste, que talvez ainda não dê motivos. Tu vigias. Lês mensagens. Inventas cenários. Quando ele se atrasa, já passaste por três infidelidades imaginárias antes de ele chegar.',
      'Não és paranóica. Tu sabes ler pessoas. O que tu não sabes ler é a tua própria história a falar por trás do que vês.',
      'Ele sente-se preso. Vigiado. Culpado de coisas que não fez, com olhares que tu lhe mandas sem perceberes. Aos poucos, vai recuando. E recuar confirma, para ti, que ele tinha algo a esconder.',
      'Mas o que ele estava a esconder era apenas o cansaço de ser tratado como criminoso de uma traição que ainda não aconteceu.'
    ],
    fraseQueDoi:
      'O teu nó não é eles serem pouco confiáveis. É tu carregares uma traição antiga que ainda não foi vista.'
  },
  salvadora: {
    lead: 'Tu escolhes projectos.',
    body: [
      'Não escolhes homens prontos. Escolhes potencial. Tu vês quem ele podia ser e apaixonas-te por essa pessoa, em vez da que está à tua frente.',
      'Pagas-lhe contas. Resolves-lhe a vida. Educas-lhe os gostos. Fazes por ele coisas que ele devia estar a fazer sozinho, e chamas a isso amor.',
      'Eles tornam-se filhos contigo. Ou rebelam-se. Em ambos os casos, a relação inverte: tu cuidas, ele recebe ou foge.',
      'Se ele estivesse bem sem ti, perderias o teu lugar. Por isso, sem perceber, escolhes sempre quem ainda não está bem.'
    ],
    fraseQueDoi:
      'Não estás a procurar parceiro. Estás a procurar quem te precise, e o que precisa não dura.'
  },
  abandono: {
    lead: 'Tu sabes que ele vai partir.',
    body: [
      'Mesmo quando ele está perto. Mesmo quando está bem. Carregas, por baixo, a certeza tranquila de que isto vai acabar, e quando começa a correr bem, é aí que tu mais te apertas por dentro.',
      'Sabotas. Crias distância antes que ele crie. Mandas mensagens que sabes que vão afastar. Procuras provas de que ele já está com um pé fora.',
      'E ele, sem perceber, recebe a mensagem: "estás a preparar-te para sair". Então prepara-se também. E a tua profecia confirma-se.',
      'Não és azarada com homens. És fluente em prever o fim ao ponto de o construíres antes do tempo.'
    ],
    fraseQueDoi:
      'O teu nó não é eles irem-se embora. É tu nunca te teres deixado ficar.'
  },
  invisibilidade: {
    lead: 'Tu desapareceste de ti.',
    body: [
      'Já não sabes dizer o que gostas, o que te dá vontade, o que farias num domingo de manhã se ninguém te visse. A tua vida tornou-se um pano de fundo para a chegada de alguém que ainda não chegou.',
      'Esperas-o nas redes, na próxima saída, no próximo amigo de amigo. E entretanto não habitas nenhum sítio dentro de ti.',
      'Os homens, todos eles, respondem ao que está vivo. Tu pediste-lhes para reconhecerem alguém que tu própria deixou de habitar.',
      'Por isso não te vêem. Não porque sejam cegos. Porque não há ali ninguém para ser visto.'
    ],
    fraseQueDoi:
      'Não é que eles deixaram de te ver. É que tu deixaste de estar ali para seres vista.'
  }
};

const EN_SOLTEIRA: Record<No, Variant> = {
  fome: {
    lead: 'You need someone to fill you.',
    body: [
      "It is not love. It is hunger. You learned, very early, that another person's attention is what keeps you standing. So when he shows up, you breathe. When he pulls back a millimetre, you suffocate.",
      "You live in vigilance. You read the tone of the last message. You replay the conversation to figure out if he was distant. When he takes long to reply, you have already travelled through three scenarios before he replies.",
      'You are not crazy. You are starving. And hunger is not your fault, it has an origin, from before any relationship of yours.',
      'But hunger exhausts whoever gets close. Not because they are weak. Because bodies near other bodies get tired of carrying hunger that is not theirs.'
    ],
    fraseQueDoi:
      "Men do not pull away because they do not deserve you. They pull away because your hunger exhausts them before they have a chance to know you.",
    travessia:
      "You do not dissolve this knot with willpower or 'feminine energy' techniques. You dissolve it by showing your own system that it no longer needs anyone awake in order to feel safe. The five sessions ahead do exactly that, one layer at a time. Each opens three days after the last."
  },
  controlo: {
    lead: 'You manage everything.',
    body: [
      "Your schedule, his life, what should happen between you in three months. You say it's because you have goals, because he is slower, because it is easier to do it yourself. Partly true.",
      "The other part, which no one taught you to see, is that controlling is the only way you know how to feel safe when another human being gets close.",
      'The men who interest you give up suggesting things. They learn, in a few weeks, that you have already decided before they open their mouth. So they stop trying.',
      "And what you experience as 'he turned passive' is the consequence of you becoming the planner of a relationship he never asked to have yet."
    ],
    fraseQueDoi:
      'You are not driving them away because you are bad. You are driving them away because no one ever taught you that you can trust without controlling.'
  },
  inferioridade: {
    lead: 'You think yourself less.',
    body: [
      'Less beautiful than you should be. Less interesting. Less young than other women. When someone shows up, you carry a quiet certainty that he will eventually find out. So you swallow. You smile when you should speak. You accept what hurts you to avoid creating a problem.',
      'Inside, you have a list of injustices you never named. Outside, you are the easy woman to live with.',
      'And men, without realising it, because they rarely do, slowly lose respect for you in silence. They do not tell you. They simply pull back into a place where you no longer have entry.',
      'Men do not desire those who erase themselves to serve. It is not injustice. It is how human systems work.'
    ],
    fraseQueDoi:
      'You are not being punished. You are being treated as the woman you present yourself as being.'
  },
  desconfianca: {
    lead: 'You expect him to disappoint you.',
    body: [
      'Always. With everyone. Even with this one, who maybe gives no reason yet. You watch. You read messages. You invent scenarios. When he is late, you have already gone through three imaginary betrayals before he arrives.',
      'You are not paranoid. You can read people. What you cannot read is your own story speaking behind what you see.',
      'He feels trapped. Watched. Guilty of things he has not done, in glances you give him without realising. Slowly, he retreats. And retreating, for you, confirms he had something to hide.',
      'But what he was hiding was simply the exhaustion of being treated as the criminal of a betrayal that has not yet happened.'
    ],
    fraseQueDoi:
      'Your knot is not that they are untrustworthy. It is that you are carrying an old betrayal that has not yet been seen.'
  },
  salvadora: {
    lead: 'You choose projects.',
    body: [
      'You do not choose ready men. You choose potential. You see who he could be and you fall in love with that person, instead of the one in front of you.',
      'You pay his bills. You fix his life. You educate his taste. You do for him things he should be doing on his own, and you call that love.',
      'They become children with you. Or they rebel. Either way, the relationship flips: you give, he receives or runs.',
      'If he were fine without you, you would lose your place. So, without realising it, you always pick someone who is not yet fine.'
    ],
    fraseQueDoi:
      'You are not looking for a partner. You are looking for someone who needs you, and what needs you does not last.'
  },
  abandono: {
    lead: 'You know he will leave.',
    body: [
      'Even when he is near. Even when things are going well. You carry, underneath, a quiet certainty that this will end, and when it starts to go well, that is when you tighten the most.',
      'You sabotage. You create distance before he can. You send messages you know will push him away. You search for proof he already has one foot out.',
      'And he, without realising, receives the message: "you are getting ready to leave". So he gets ready too. And your prophecy is confirmed.',
      'You are not unlucky with men. You are fluent at predicting the ending, to the point of building it ahead of time.'
    ],
    fraseQueDoi:
      'Your knot is not them leaving. It is that you never let yourself stay.'
  },
  invisibilidade: {
    lead: 'You have disappeared from yourself.',
    body: [
      'You can no longer say what you like, what stirs you, what you would do on a Sunday morning if no one were watching. Your life has become a backdrop for the arrival of someone who has not yet arrived.',
      'You wait for him on the apps, on the next outing, on the next friend of a friend. Meanwhile you inhabit nowhere inside yourself.',
      'Men, all of them, respond to what is alive. You asked them to recognise someone you yourself stopped inhabiting.',
      'So they do not see you. Not because they are blind. Because there is no one there to be seen.'
    ],
    fraseQueDoi:
      'It is not that they stopped seeing you. It is that you stopped being there to be seen.'
  }
};

export function noContentFor(locale: Locale, target: Target, no: No) {
  if (target === 'solteira') {
    return (locale === 'pt' ? PT_SOLTEIRA : EN_SOLTEIRA)[no];
  }
  return baseContent(locale, no);
}

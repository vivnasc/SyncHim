# SESSÃO 2, DIAGNÓSTICO

**Tier:** 0 (grátis)
**Acesso:** Imediato após Sessão 1
**Tipo:** Questionário interactivo + cálculo + revelação

---

## TÍTULO VISÍVEL

O teu nó tem nome.

## INTRODUÇÃO

Vou-te mostrar 21 situações.

Para cada uma, escolhe com honestidade brutal, não a resposta certa, a resposta real. Quanto mais honesta fores, mais nítido o teu nó vai ficar.

Ninguém vê excepto tu.

Não há resposta certa. Não há resposta errada. Há apenas o que tu reconheces.

[ Começar ]

---

## AS 21 SITUAÇÕES

Para cada situação, a utilizadora escolhe uma de quatro opções:
- **Nunca** (0 pontos)
- **Às vezes** (1 ponto)
- **Frequentemente** (2 pontos)
- **Sempre** (3 pontos)

### Bloco, Nó da Fome (q1, q2, q3)

**q1.** Quando ele demora a responder a uma mensagem, eu reviso a conversa para perceber o que disse de errado.

**q2.** Quando estamos os dois calados, eu sinto necessidade de quebrar o silêncio.

**q3.** O meu humor do dia depende muito de como ele acordou.

### Bloco, Nó do Controlo (q4, q5, q6)

**q4.** Eu sei melhor do que ele o que ele precisa de fazer no dia-a-dia.

**q5.** Já desisti de pedir e prefiro fazer eu, é mais rápido.

**q6.** Quando ele toma uma decisão sem me consultar, sinto-me desrespeitada.

### Bloco, Nó da Inferioridade (q7, q8, q9)

**q7.** Sinto que ele podia ter alguém melhor do que eu.

**q8.** Engulo coisas que me magoam para não criar problema.

**q9.** Quando ele me elogia, custa-me acreditar.

### Bloco, Nó da Desconfiança (q10, q11, q12)

**q10.** Já vi o telemóvel dele às escondidas mais de uma vez.

**q11.** Quando ele se atrasa, eu imagino cenários antes de ele chegar.

**q12.** Acredito que a maioria dos homens, mais cedo ou mais tarde, trai.

### Bloco, Nó da Salvadora (q13, q14, q15)

**q13.** Eu vejo nele um potencial que ele próprio ainda não vê.

**q14.** Faço por ele coisas que ele devia fazer sozinho.

**q15.** Se ele estivesse bem sem mim, eu sentir-me-ia menos necessária.

### Bloco, Nó do Abandono (q16, q17, q18)

**q16.** Tenho medo, mesmo nos bons momentos, de que ele se vá embora um dia.

**q17.** Já criei distância de propósito antes que ele criasse.

**q18.** Quando ele se afasta um pouco, eu já estou a preparar-me para o fim.

### Bloco, Nó da Invisibilidade (q19, q20, q21)

**q19.** Já não sei dizer o que gosto de fazer fora de ser esposa ou mãe.

**q20.** Sinto-me invisível dentro da minha própria casa.

**q21.** Cobro-lhe atenção, mas eu própria já não me dou atenção há anos.

---

## LÓGICA DE CÁLCULO

```javascript
function calcularNo(respostas) {
  const pontuacoes = {
    fome: respostas.q1 + respostas.q2 + respostas.q3,
    controlo: respostas.q4 + respostas.q5 + respostas.q6,
    inferioridade: respostas.q7 + respostas.q8 + respostas.q9,
    desconfianca: respostas.q10 + respostas.q11 + respostas.q12,
    salvadora: respostas.q13 + respostas.q14 + respostas.q15,
    abandono: respostas.q16 + respostas.q17 + respostas.q18,
    invisibilidade: respostas.q19 + respostas.q20 + respostas.q21,
  };

  // Ordem de desempate
  const ordemDesempate = [
    'fome', 'controlo', 'invisibilidade', 'inferioridade',
    'abandono', 'desconfianca', 'salvadora'
  ];

  let dominante = ordemDesempate[0];
  let maior = pontuacoes[dominante];

  for (const no of ordemDesempate) {
    if (pontuacoes[no] > maior) {
      dominante = no;
      maior = pontuacoes[no];
    }
  }

  // Segundo maior (nó secundário)
  let secundario = null;
  let segundoMaior = -1;
  for (const no of ordemDesempate) {
    if (no === dominante) continue;
    if (pontuacoes[no] > segundoMaior) {
      secundario = no;
      segundoMaior = pontuacoes[no];
    }
  }

  return { dominante, secundario, pontuacoes };
}
```

---

## ECRÃ DE RESULTADO

Após calcular, apresentar:

### Cabeçalho

> O teu nó dominante chama-se:
>
> **[NOME DO NÓ]**

### Descrição (varia por nó, versões curtas para o resultado do Tier 0)

#### Se nó dominante = Fome:

> Tu precisas que ele te preencha.
>
> Vives em fusão ansiosa. Observas. Antecipas. O teu humor sobe e desce com o tom da voz dele. Quando ele se afasta um pouco, tu vais buscar, e é exactamente esse ir buscar que o afasta mais.
>
> Não é amor. É fome. E a fome não tem culpa, tem origem. Vem de antes do teu marido.
>
> O teu casamento não está a morrer porque ele esfriou. Está a morrer porque a tua fome esgotou-o.

#### Se nó dominante = Controlo:

> Tu geres tudo.
>
> A casa, os filhos, as finanças, a agenda dele. Dizes que é porque tem de ser, mas no fundo, controlar é o único modo que conheces de te sentires segura.
>
> Ele desistiu de propor. De decidir. De aparecer. Tu já decidiste por ambos.
>
> Não estás a sufocá-lo por ser má. Estás a sufocá-lo por nunca te terem ensinado que se pode confiar sem controlar.

#### Se nó dominante = Inferioridade:

> Tu achas-te menos.
>
> Menos bonita, menos interessante, menos do que ele merece. Vives para merecer ficar. Fazes tudo certo. Engoles. Sorris.
>
> E ele perde respeito por ti em silêncio. Não te diz. Só se afasta.
>
> Os homens não desejam quem se apaga para servir. Não é injustiça, é como sistemas funcionam. Tu não estás a ser punida. Estás a ser tratada como a mulher que tu te apresentas como sendo.

#### Se nó dominante = Desconfiança:

> Tu esperas traição.
>
> Vigias. Lês mensagens. Crias cenários. Quando ele se atrasa, já viajaste três infidelidades na cabeça antes de ele chegar.
>
> Ele sente-se preso. Vigiado. Culpado de coisas que não fez. Afasta-se. Tu usas isso como prova.
>
> O teu nó não é ele ser pouco confiável. É tu carregares uma traição antiga que ainda não foi vista.

#### Se nó dominante = Salvadora:

> Tu vê-lo como projecto.
>
> Queres salvá-lo de algo. Amas-o pelo potencial, não pelo presente. Fazes por ele o que ele devia fazer sozinho. Dizes que é amor.
>
> É medo de o perder se ele se curar sozinho.
>
> Ele sente-se infantilizado. E homens infantilizados ou se rebelam, ou se rendem. Nenhum dos dois te ama de volta como tu queres.

#### Se nó dominante = Abandono:

> Tu tens medo de que ele se vá embora.
>
> Sempre. Mesmo em paz. Por antecipar, sabotas. Crias distância antes que ele crie. Pune-lo por crimes que ele não cometeu.
>
> Quando ele finalmente se afasta, exausto, tu dizes "eu sabia".
>
> O teu nó não é a relação. É um abandono antigo que ainda dói, e que está a usar este homem como ensaio do fim que tu já viveste antes.

#### Se nó dominante = Invisibilidade:

> Tu desapareceste.
>
> Dentro da relação, dentro da casa, dentro de ti. Já não sabes o que gostas de fazer fora de ser esposa ou mãe. Sentes-te transparente.
>
> Cobras-lhe atenção. Mas tu própria já não te dás atenção há anos.
>
> Os homens respondem ao que está vivo. Tu pediste-lhe para ver alguém que tu deixaste de habitar.

---

## BANNER DE UPGRADE INTEGRADO

(Aparece imediatamente após a descrição)

> Este é o teu nó. Já o viste.
>
> Mas vê-lo não é dissolvê-lo.
>
> Se quiseres descer ao que está debaixo, a origem, o que ele está a fazer ao teu casamento, e como dissolvê-lo, há dois caminhos.

**Atravessar este nó**, R$ 127
> 5 sessões personalizadas + 5 práticas + acesso vitalício a este nó.

**Biblioteca completa**, R$ 297
> Os 7 nós, completos. Para refazeres o diagnóstico quantas vezes quiseres ao longo da vida e atravessares qualquer nó que aparecer.

---

> Ou volta quando estiveres pronta.
>
> O diagnóstico fica aqui, e é teu para refazeres sempre que precisares.

[ Atravessar agora ] [ Voltar ao painel ]

---

## ASSINATURA, Marina Vale

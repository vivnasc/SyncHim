# 15 VÍDEOS PARA TIKTOK + INSTAGRAM REELS

Sistema: GitHub Actions + Midjourney motion + ElevenLabs voz.
Formato: 9:16 (vertical, 1080x1920).
Duração: 20-90 segundos.

## Distribuição

- **Vídeos 1-5:** Marina talking head (avatar animado + voz)
- **Vídeos 6-10:** Texto-na-tela com voz off
- **Vídeos 11-15:** Mãos a escrever + voz off

## Princípios

1. Cada vídeo é **uma ideia só**. Nunca duas.
2. Hook nos primeiros 1.5 segundos. Sem desperdiçar.
3. Voz: contralto, baixa, sem urgência, com pausas.
4. Música: NENHUMA nos primeiros 5 vídeos. Vamos testar se Marina segura sem música. Se a retenção descer abaixo de 35%, adicionamos ambient sound subtil (não música pop).
5. Legendas SEMPRE on (TikTok lê 80% sem som).
6. Sem chamadas-à-ação no vídeo. CTA sempre na caption.

---

# TIPO 1 — TALKING HEAD MARINA (vídeos 1-5)

Avatar Marina animado via Midjourney motion + lip-sync. Voz ElevenLabs com a Marina-voz definida.

**Setup técnico para o Claude Code:**

```yaml
type: talking_head
duration: 30-45s
mj_motion_prompt: "[ver prompt específico por vídeo abaixo]"
voiceover_engine: elevenlabs
voice_id: [marina-voice-id-eleven-labs]
voice_settings:
  stability: 0.65
  similarity_boost: 0.75
  style: 0.20
  speed: 0.92
  pause_at_punctuation: true
captions:
  font: "Inter Medium"
  size: 56
  color: "#F2E8DC"
  bg: "#1A1410cc"
  position: "bottom_third"
  word_by_word: true
```

---

## VÍDEO 1 — "Os homens não desejam quem se apaga"

**Hook (0-2s):** Marina olha à câmara, faz pausa, depois fala devagar.

**Imagem MJ (cref Marina-âncora):**
```
The same mixed-race woman seated facing camera in a bright warm minimalist room, 
soft natural daylight, looking directly into camera with steady warm gaze, 
wearing the cream silk blouse, natural curly hair, subtle ambient movement 
of hair and breathing, slow blink, faintest expression of compassion mixed 
with refusal to soften, very subtle head micro-movements, cinematic stillness, 
8k photorealistic --ar 9:16 --motion medium --cref [URL_ANCORA] --cw 100
```

**Script de voz (lê em 35-40s, com pausas marcadas com /):**

```
Os homens não desejam quem se apaga para servir. //

Não é injustiça. //

É como sistemas humanos funcionam. //

A mulher que entrega tudo torna-se útil. //
A mulher útil é consumida. //

Ninguém deseja o que consome rotineiramente. //

Tu não desapareceste de propósito. //
Aprendeste que ser boa mulher era entregar tudo. //

A reconstrução começa em ti. //

Antes dele.
```

**Caption:**
```
A invisibilidade conjugal é, quase sempre, a continuação de uma invisibilidade interior. 

Mulheres que se dissolvem nos papéis param de habitar a si próprias. O outro deixa de ver porque não há ninguém para ver. 

Diagnóstico grátis no link da bio.

#desejo #mulher #casamento #relacionamento #amor #autoconhecimento #presenca #mulher40
```

---

## VÍDEO 2 — "Tu não és complicada — estás cruzada"

**Hook:** Marina ligeiro sorriso de canto, mas afiado.

**Imagem MJ:**
```
The same mixed-race woman in close framing from chest up, slightly tilted head 
suggesting compassionate observation, soft daylight from window, warm minimalist 
background slightly out of focus, gentle ambient movement, the faintest hint of 
a knowing smile that does not quite arrive at her mouth, eyes steady and warm, 
cinematic stillness with breathing motion, photorealistic 8k 
--ar 9:16 --motion low --cref [URL_ANCORA] --cw 100
```

**Script (25-30s):**

```
Tu não és complicada. //

Tu estás cruzada. //

Cruzada entre o que aprendeste em criança... //
... e o que precisas hoje. //

Cruzada entre o que dizes... //
... e o que sentes quando o dizes. //

Não és problema. //

És sistema antigo a tentar habitar uma vida nova. //

E ainda não conseguiu.
```

**Caption:**
```
A maior parte das mulheres que se chamam a si próprias "complicadas" estão a carregar dois ou mais padrões a operar em direções opostas.

Não é defeito. É sistema. E sistemas — quando vistos — começam a soltar.

#mulher #autoconhecimento #relacionamento #casamento #reflexao #mulher40
```

---

## VÍDEO 3 — "Vais ter de aprender a ficar"

**Hook:** Marina olha à câmara durante 2 segundos em silêncio antes de falar.

**Imagem MJ:**
```
The same mixed-race woman in medium close-up, sitting near a window with soft 
golden hour light wrapping her face from the side, contemplative gaze direct 
to camera, natural curly hair partially backlit by the window, wearing cream 
silk blouse, very subtle movement of breathing and a single slow blink, 
warm shadow on the right side of her face, cinematic, photorealistic 8k 
--ar 9:16 --motion very_low --cref [URL_ANCORA] --cw 100
```

**Script (40-45s):**

```
Tu não tens medo de o perder. //

Tens medo de descobrir... //

... que desta vez não vais perder. //

E que vais ter de aprender a ficar. //
//
Ficar é mais difícil que partir. //

Partir é resposta. //

Ficar é escolha. //

E tu nunca aprendeste a escolher. //

A boa notícia: //

aprende-se.
```

**Caption:**
```
Em mulheres com ferida de abandono, partir é confortável (já foi treinado), ficar é estranho. 

Por isso sabotam relações boas. Não por crueldade — porque o sistema não sabe habitar paz duradoura. 

Aprende-se. Lentamente. Em pequenas doses.

Diagnóstico no link da bio.

#abandono #relacionamento #casamento #amor #autoconhecimento #mulher40
```

---

## VÍDEO 4 — "Tu já sabes a resposta"

**Hook:** Marina inclina ligeiramente a cabeça ao começar, gesto de quem vai dizer algo difícil.

**Imagem MJ:**
```
The same mixed-race woman in close framing, head slightly tilted at the start, 
direct steady gaze to camera, warm afternoon light from camera-left, wearing the 
cream silk blouse, natural curly hair past shoulders, blurred warm interior 
background, faint ambient movement, slow breathing, the gaze of a woman who 
knows exactly what she is about to say, cinematic stillness, photorealistic 8k 
--ar 9:16 --motion low --cref [URL_ANCORA] --cw 100
```

**Script (35-40s):**

```
Tu já sabes a resposta. //

Tu sabes se este casamento ainda tem solo. //

Tu sabes se já decidiste... //
... e estás à espera de ter coragem. //

Tu sabes. //

Só ainda não te deste permissão de saber o que sabes. //
//
Quando estiveres pronta para saber, //

começa por ouvir-te em silêncio... //

... três minutos por dia. //

A resposta sobe.
```

**Caption:**
```
O saber interior está sempre disponível. O que falta, na maioria das mulheres, é silêncio suficiente para o deixar emergir.

Não é decisão. É escuta. A decisão vem depois, sem esforço, quando o saber se torna inegável.

#intuicao #escuta #autoconhecimento #casamento #mulher #reflexao #mulher40
```

---

## VÍDEO 5 — "A mulher que se acha digna"

**Hook:** Marina meio sorriso, gesto de mãos quase aparecendo no enquadramento.

**Imagem MJ:**
```
The same mixed-race woman in medium close-up, warm confident closed-mouth smile, 
steady gaze direct to camera with quiet authority, natural curly hair, wearing 
cream silk blouse with gold hoop earrings catching light, soft daylight from 
window, warm minimalist background, subtle ambient movement and breathing, the 
expression of a woman who has earned what she knows, cinematic photorealistic 8k 
--ar 9:16 --motion low --cref [URL_ANCORA] --cw 100
```

**Script (30-35s):**

```
A mulher que se acha digna... //

... é tratada como digna. //

Não porque o universo é justo. //
O universo não é justo. //

Mas porque o sistema nervoso do outro... //

... lê constantemente o teu sistema. //

E adapta-se. //
//
Não cobres respeito. //

Sê alguém a quem se respeita. //

E vê quem fica.
```

**Caption:**
```
Os neurónios espelho fazem com que sistemas humanos próximos sincronizem em estado interno. 

Isto significa: tu não consegues "esconder" auto-percepção. Ela sai por todas as outras vias. E o outro responde. Sempre.

#autoestima #mulher #relacionamento #neurociencia #amor #casamento #mulher40
```

---

# TIPO 2 — TEXTO-NA-TELA + VOZ OFF (vídeos 6-10)

Sem rosto. Apenas frases que aparecem ritmadas no ecrã, voz off da Marina por cima. Mais fácil para o teu sistema produzir, mais "scrollável", potencial viral mais alto.

**Setup técnico:**

```yaml
type: kinetic_text
duration: 15-30s
background: 
  color: "#1A1410"
  texture: paper_noise_4_percent
typography:
  primary_font: "EB Garamond"
  secondary_font: "Inter"
  size_range: [48, 96]
  color_primary: "#F2E8DC"
  color_accent: "#D4A857"
animation:
  type: fade_in_word_by_word
  speed: synced_to_voice
voiceover_engine: elevenlabs
elements:
  - vesica_piscis_between_sections
  - star_persa_at_end
captions: built_into_visual
```

---

## VÍDEO 6 — "Há 7 nós"

**Duração:** 20s

**Sequência de tela (sincronizada com voz):**

```
[0-2s]  Tela escura.
        Aparece: "Há 7 nós."
        
[2-4s]  "que fazem o teu casamento"
        
[4-6s]  "morrer em silêncio."
        
[6-8s]  [vesica piscis aparece e desaparece]
        
[8-10s] "Casamentos não morrem"
        "por falta de amor."
        
[10-13s] "Morrem por"
         [pausa visual de 1s]
         "DESSINCRONIA." (em ouro, maior)
         
[13-16s] "Saber qual é o teu nó"
         
[16-19s] "é o primeiro passo."
         
[19-20s] [estrela persa]
         "— Marina Vale"
```

**Script de voz (lendo as palavras conforme aparecem):**

```
Há 7 nós que fazem o teu casamento morrer em silêncio. //
//
Casamentos não morrem por falta de amor. //
Morrem por... dessincronia. //
//
Saber qual é o teu nó... //
é o primeiro passo.
```

**Caption:**
```
Não há mulher que não tenha um destes 7 nós a operar dentro dela. 

A maioria tem dois ou três. Um deles é dominante. 

Diagnóstico grátis no link da bio.

#casamento #relacionamentos #autoconhecimento #amor #esposa #mulher40
```

---

## VÍDEO 7 — "Quando ele te abraça"

**Duração:** 25s

**Sequência de tela:**

```
[0-2s]  "Quando ele te abraça"
        
[2-4s]  "e tu já estás a pensar"
        
[4-6s]  "no fim do abraço."
        
[6-8s]  [pausa, vesica piscis]
        
[8-10s] "Isso"
        [pausa]
        
[10-13s] "tem nome." (em ouro)
        
[13-16s] "Não és fria."
        
[16-19s] "Não és incapaz de amar."
        
[19-22s] "Carregas um nó"
         "que tem origem"
         "antes dele."
         
[22-25s] [estrela persa]
         "— Marina Vale"
```

**Script de voz:**

```
Quando ele te abraça //
e tu já estás a pensar no fim do abraço... //
//
isso tem nome. //
//
Não és fria. //
Não és incapaz de amar. //
//
Carregas um nó que tem origem... //
antes dele.
```

**Caption:**
```
Mulheres que carregam um nó activo descrevem-se a si próprias como "frias" ou "incapazes de amar". 

Não são. Estão dessincronizadas. E o nó tem origem na infância, não no marido.

Diagnóstico no link da bio.

#casamento #amor #relacionamento #mulher #autoconhecimento #mulher40
```

---

## VÍDEO 8 — "As coisas que tu nunca disseste"

**Duração:** 28s

**Sequência de tela:**

```
[0-2s]  "As coisas"
        
[2-4s]  "que tu nunca disseste."
        
[4-6s]  [vesica piscis pausa]
        
[6-9s]  "Que aquela vez,"
        "no segundo ano de casados,"
        
[9-12s] "quando ele esqueceu o teu aniversário,"
        
[12-15s] "mudou alguma coisa"
         "para sempre."
         
[15-18s] [pausa]
         "Tu carregas"
         
[18-21s] "um livro inteiro"
         "de não-ditos."
         
[21-24s] "Tu não és estranha."
         
[24-27s] "És uma de muitas."
         
[27-28s] [estrela persa]
         "— Marina"
```

**Script de voz:**

```
As coisas que tu nunca disseste... //
//
Que aquela vez, no segundo ano de casados, //
quando ele esqueceu o teu aniversário, //
mudou alguma coisa para sempre. //
//
Tu carregas um livro inteiro de não-ditos. //
//
Tu não és estranha. //
//
És uma de muitas.
```

**Caption:**
```
As coisas não-ditas viram pedras no fundo do casamento. 

Não as podes dizer todas. Mas vê-las em ti, nomeá-las para ti, é o começo de não as carregar como nós.

#casamento #mulher #amor #relacionamento #reflexao #autoconhecimento #mulher40
```

---

## VÍDEO 9 — "Tu não estás zangada com ele"

**Duração:** 22s

**Sequência de tela:**

```
[0-2s]  "Tu não estás zangada"
        
[2-3s]  "com ele."
        
[3-5s]  [pausa]
        
[5-8s]  "Estás zangada com o homem"
        
[8-11s] "que tu projectaste sobre ele"
        
[11-13s] "durante 15 anos."
        
[13-16s] "Por baixo dos gestos dele"
         
[16-19s] "tu vês a tua história."
         
[19-22s] "O pai. O primeiro amor. A mãe."
         
[22s]   [estrela persa]
```

**Script de voz:**

```
Tu não estás zangada com ele. //
//
Estás zangada com o homem... //
que tu projectaste sobre ele... //
durante quinze anos. //
//
Por baixo dos gestos dele, //
tu vês a tua história. //
//
O pai. O primeiro amor. A mãe.
```

**Caption:**
```
A teoria psicanalítica chama-lhe transferência. Transferimos para a pessoa actual emoções, expectativas, e medos de pessoas anteriores. 

Em casamentos longos, esta transferência acumula-se até tornar invisível o homem real. Ver de novo é trabalho.

#psicanalise #casamento #relacionamento #autoconhecimento #amor #mulher #mulher40
```

---

## VÍDEO 10 — "A diferença entre amar e precisar"

**Duração:** 30s

**Sequência de tela:**

```
[0-2s]  "Como saber"
        
[2-4s]  "se tu o amas"
        
[4-6s]  "ou apenas precisas dele."
        
[6-8s]  [vesica piscis]
        
[8-11s] "A ideia de ele não estar..."
        
[11-13s] "Gera pânico?" (em ouro)
         
[13-15s] "Ou tristeza?" (em ouro)
        
[15-19s] "Pânico"
         "é necessidade."
         
[19-22s] "Tristeza"
         "é amor."
         
[22-26s] "Maioria das mulheres"
         "mistura os dois."
         
[26-29s] "Separar"
         "é o trabalho de uma vida."
         
[29-30s] [estrela persa]
         "— Marina"
```

**Script de voz:**

```
Como saber se tu o amas... //
ou apenas precisas dele. //
//
A ideia de ele não estar... //
//
Gera pânico? //
Ou tristeza? //
//
Pânico... é necessidade. //
Tristeza... é amor. //
//
Maioria das mulheres mistura os dois. //
//
Separar... é o trabalho de uma vida.
```

**Caption:**
```
A dependência emocional é frequentemente confundida com amor profundo. 

Mas amor sustenta-se em duas pessoas inteiras. Dependência sustenta-se no medo da ausência. 

Diagnóstico no link da bio.

#amor #dependencia #casamento #relacionamento #autoconhecimento #mulher #mulher40
```

---

# TIPO 3 — MÃOS A ESCREVER + VOZ OFF (vídeos 11-15)

Câmara estática nas mãos da Marina escrevendo. Voz off da Marina por cima. Atmosférico, lento, raro no mercado. Quem aguenta 60 segundos disto é leitora ideal.

**Setup técnico:**

```yaml
type: hands_writing
duration: 45-90s
mj_motion_prompt: "[ver prompt específico por vídeo abaixo]"
voiceover_engine: elevenlabs
voice_settings:
  speed: 0.85  # mais lenta que talking head
  pause_at_punctuation: true
ambient_sound: 
  optional: pen_on_paper_subtle
  volume: -18db
captions:
  position: bottom_third
  style: italic_serif
```

**Imagem base MJ (com pequenas variações por vídeo):**

```
Close-up of the same mixed-race woman's hands writing slowly in a leather-bound 
journal with a vintage fountain pen, warm medium-brown skin with visible texture, 
one simple gold ring on the middle finger, fingernails short and unpainted, 
hands captured in slow continuous writing motion, the page filling gradually 
with elegant cursive Portuguese in dark sepia ink, surface is an aged warm 
wood desk, soft warm tungsten light from upper left creating a pool of golden 
light, deep shadows around edges, very subtle natural motion of hand movement 
and breathing, intimate confessional atmosphere, photorealistic 8k 
--ar 9:16 --motion low --cref [URL_HANDS] --cw 80
```

(`URL_HANDS` é o upscale do prompt 9 dos prompts MJ — a foto das mãos da Marina a escrever que tu já tens ou vais gerar)

---

## VÍDEO 11 — "Sobre a fome"

**Duração:** 60s

**Texto que aparece sendo escrito no caderno (em manuscrito):**

```
A fome não é amor.

Aprendeste, muito cedo,
que a presença de outro
era o que te mantinha de pé.

Hoje vives em vigilância.
Lês o tom da voz dele
de manhã para saber
como vai ser o teu dia.

Não estás louca.

Estás faminta.

E a fome não tem culpa.

Tem origem.

Vem de antes dele.
```

**Voz off (lida em paralelo, no mesmo ritmo da escrita):**

A voz lê o mesmo texto que aparece, com pausas onde há quebras de linha.

**Caption:**
```
Sobre a fome — um dos 7 nós.

A fome relacional nasce em criança, quando o amor ficou ligado à presença de alguém específico que ia e voltava. 

Em adulta, escolhes parceiros que reactivam essa fome. Não é falta de carácter. É um sistema antigo que pede para ser visto.

Diagnóstico no link da bio.

#fome #dependenciaemocional #casamento #amor #autoconhecimento #mulher
```

---

## VÍDEO 12 — "Sobre o controlo"

**Duração:** 65s

**Texto que aparece sendo escrito:**

```
Tu não controlas.

Tu organizas.
É o que dizes a ti própria.

A verdade é mais difícil.

Tu geres tudo
porque alguém,
há muito tempo,
te ensinou que se tu não geres,
algo importante vai falhar.

Ele desistiu de propor.
De decidir.
De aparecer com ideias.

Aprendeu que tu já decidiste
antes dele abrir a boca.

Por isso já não tenta.

O que tu sentes
como "ele virou criança"
é a consequência
de te teres tornado a mãe
que ele nunca pediu para ter.
```

**Caption:**
```
Sobre o controlo — outro dos 7 nós.

O controlo nasce em mulheres que cresceram em casas onde alguém devia ter sido o adulto e não foi. 

Tu, criança, tornaste-te o adulto. A função ficou. Hoje, opera em piloto automático contra um homem que não te ameaça.

#controlo #casamento #relacionamento #mulher #autoconhecimento
```

---

## VÍDEO 13 — "Sobre a invisibilidade"

**Duração:** 55s

**Texto que aparece sendo escrito:**

```
Tu desapareceste.

Não foi num momento.

Foi em milhares
de pequenos não-disseste,
não-fizeste,
não-mostraste.

Hoje, quando alguém te pergunta
como tu estás,

tu respondes
contando como estão os teus filhos.

Os homens
— todos eles —
respondem ao que está vivo.

Tu pediste-lhe
que visse alguém
que tu já não habitavas.

Não é que ele deixou de te ver.

É que tu deixaste
de estar lá
para ser vista.
```

**Caption:**
```
Sobre a invisibilidade — outro dos 7 nós.

Ninguém pode amar quem não está lá. Tu confundiste dissolver-te com ser boa mulher. 

A travessia começa quando tu voltas a ocupar espaço — primeiro em ti, depois no mundo.

#invisibilidade #mulher #casamento #presenca #autoconhecimento
```

---

## VÍDEO 14 — "Sobre o que dura"

**Duração:** 70s

**Texto que aparece sendo escrito:**

```
O que dura num casamento
não é o amor.

Amor todos os casamentos têm.

O que dura é:

a capacidade
de regular o próprio sistema.

A capacidade
de tolerar diferença
sem fusão.

A capacidade
de habitar ciclos
sem catastrofizar.

A capacidade
de cuidar do solo
sem cobrar resultados.

Amor é matéria-prima.

O resto é arquitectura.

Trabalhar a arquitectura
é o que separa
casamentos que duram
de casamentos que terminam

— com ou sem amor.
```

**Caption:**
```
John Gottman acompanhou casais durante 40 anos. A conclusão: amor não prediz longevidade. 

Predizem regulação emocional, tolerância à diferença, e rituais de conexão. 

Amor é matéria-prima. Sistema é arquitectura. Trabalhar o sistema é onde está o trabalho real.

#casamento #amor #gottman #relacionamento #psicologia
```

---

## VÍDEO 15 — "Para ti que leste até aqui"

**Duração:** 90s

Este é o vídeo final, mais pessoal, com voz mais íntima ainda.

**Texto que aparece sendo escrito:**

```
Para ti, que leste até aqui.

Tu chegaste por algum motivo.

Talvez algo no que leste
te tenha tocado.

Talvez algo te tenha incomodado.

Ambos são sinais.

Eu não vou prometer-te
nada do que outros prometem.

Não te vou dizer
que o teu casamento
vai voltar a ser como no início.

Os casamentos
não voltam para trás.

Mas podem mover-se para a frente.

Para um lugar mais honesto.

Mais habitado.

Mais real.

Há um diagnóstico
de 21 perguntas.

8 minutos.

Diz-te qual dos 7 nós
está activo em ti.

Não muda nada
de imediato.

Mas muda tudo
de futuro.

Quando estiveres pronta.

Link na bio.
```

**Caption:**
```
Para ti, que chegaste até aqui — obrigada.

Não há urgência. Não há promessa rápida. Há ver. E ver, para mulheres que carregam décadas de não-vistas, é o presente raro.

8 minutos. Grátis. Para sempre teu.

Link na bio.

#mulher #casamento #autoconhecimento #presenca #amor #mulher40
```

---

# NOTAS DE PRODUÇÃO PARA O CLAUDE CODE

## Estrutura do repositório

```
synchim-videos/
├── videos/
│   ├── 001-os-homens-nao-desejam/
│   │   ├── config.yaml
│   │   ├── script.md
│   │   ├── voiceover.mp3
│   │   ├── motion-image.mp4
│   │   └── final.mp4
│   ├── 002-nao-es-complicada/
│   └── ...
├── assets/
│   ├── marina-motion-frames/
│   ├── hands-writing-frames/
│   ├── voice-samples/
│   └── tokens.css
└── scripts/
    ├── elevenlabs-generate.js
    ├── mj-motion-fetch.js
    ├── compose-video.js (FFmpeg)
    └── upload-tiktok-ig.js
```

## Cadência de publicação

15 vídeos / 30 dias = 1 vídeo a cada 2 dias.

Sugestão de calendário:
```
Dia  2: Vídeo 1  (talking head)
Dia  4: Vídeo 6  (kinetic text)
Dia  6: Vídeo 11 (hands writing)
Dia  8: Vídeo 2  (talking head)
Dia 10: Vídeo 7  (kinetic text)
Dia 12: Vídeo 12 (hands writing)
... etc.
```

Alternar os 3 tipos cria diversidade no feed.

## Voz Marina — config ElevenLabs

Antes de gerar os 15, **escolhe a voz da Marina** no ElevenLabs:

1. Procura por vozes femininas, idade 40+, **portuguesas (PT) ou brasileiras com sotaque suave**.
2. Contralto. Não soprano. Voz que parece vir de baixo do peito.
3. Ritmo lento natural. Não a aceleres muito.
4. **Stability: 0.65** (consistente mas com nuance)
5. **Style: 0.20** (subtil, não expressiva)

A escolha de voz é a decisão visual mais importante destes vídeos. Se escolheres mal, os vídeos vão soar a robô. Testa 3-5 vozes ditas com a mesma frase ("Tu não és complicada. Tu estás cruzada.") antes de decidir.

## Música ou ambient sound

Recomendação inicial: **silêncio**. Nada. Apenas voz da Marina.

A maioria dos vídeos de coach feminino tem música emocional sentimental. Tu queres o oposto. Voz nua = autoridade.

**Excepção:** vídeos do tipo 3 (mãos a escrever) podem ter:
- Som muito subtil de caneta no papel (-18db)
- Possivelmente uma nota de piano longa em loop (-25db)

Mas nunca música pop, não trap, não chill beat. Marina não está nessa frequência.

## Legendas / Captions on-screen

TikTok lê 80%+ sem som. Legendas são essenciais.

Estilo recomendado:
- Fonte: **Inter Medium**
- Tamanho: 56-72px
- Cor texto: #F2E8DC
- Cor destaque (palavras-chave): #D4A857
- Background: #1A1410cc (semi-transparente)
- Posição: terço inferior
- Animação: aparecem palavra-a-palavra, sincronizado com voz

**As legendas têm de ser EXACTAMENTE o que a voz diz.** Não resumos. Não reformulações.

---

# RESUMO

**Total entregue:**

- 15 vídeos completos com scripts, prompts MJ, configs ElevenLabs, e captions
- 5 tipos talking head (Marina rosto)
- 5 tipos kinetic text (sem rosto)
- 5 tipos hands writing (mãos)

**Tudo pronto para o Claude Code converter em pipeline GitHub Actions:**
- Lê o markdown
- Gera o motion no Midjourney via API
- Gera a voz no ElevenLabs via API
- Compõe com FFmpeg
- Publica no TikTok + IG Reels via APIs

Próxima fase: **iterar baseado em performance**. Primeiros 5 vídeos vão dizer-te qual tipo funciona melhor para o teu nicho. A partir do dia 14, ajustamos a proporção.

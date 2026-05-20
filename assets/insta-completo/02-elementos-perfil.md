# ELEMENTOS VISUAIS DO PERFIL

Todos os elementos seguem a paleta SyncHim já fechada:
- bg: #1A1410 (marrom escuro)
- texto: #F2E8DC (creme quente)
- ouro: #D4A857 (acentos raros)
- linha: #3A2E22

Tipografia: EB Garamond (serif) + Inter (sans).

---

## 1. FOTO DE PERFIL

**Imagem:** a Marina-âncora (a que tu já geraste, mestiça, sorriso suave, gaze direto).

**Crop:** quadrado 400x400px no mínimo (1000x1000 ideal).

**Tratamento:** 
- Apenas o rosto + ombros (não corpo inteiro)
- Centrada
- Sem texto sobre a foto
- Sem moldura colorida
- Sem filtros adicionais

**Versão alternativa (se quiseres mais misterioso):** 
Usar a foto da Marina à janela (de costas) com luz dourada — apenas a silhueta com cabelo. Mais arrojado, menos converte ao início. Não recomendo.

**Fica com a Marina de rosto.** É o que vende.

---

## 2. HIGHLIGHTS COVERS (Instagram)

Cria 6 highlights principais. Cada um com um cover minimalista — apenas a estrela persa em ouro sobre fundo marrom escuro, com legenda em baixo.

### Highlights e suas legendas:

1. **Os 7 nós** (overview do método)
2. **Diagnóstico** (testemunhos + link)
3. **Cartas** (preview de cartas enviadas, snippets)
4. **Sobre** (sobre a Marina, sem rosto, apenas texto)
5. **Perguntas** (FAQ visual)
6. **Para mulheres** (mensagens recebidas, anonimizadas)

### Prompt SVG para covers (executável pelo teu sistema):

```svg
<svg viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="320" fill="#1A1410"/>
  
  <!-- Textura sutil (filter noise) -->
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/>
    <feColorMatrix values="0 0 0 0 0.95
                          0 0 0 0 0.91
                          0 0 0 0 0.86
                          0 0 0 0.04 0"/>
  </filter>
  <rect width="320" height="320" filter="url(#noise)" opacity="0.4"/>
  
  <!-- Estrela persa 8 pontas centrada (usa o ficheiro 05-estrela-persa.svg já criado) -->
  <g transform="translate(160, 130) scale(0.4)">
    <!-- substituir aqui pelo path da estrela persa -->
  </g>
  
  <!-- Texto da legenda -->
  <text x="160" y="220" 
        font-family="EB Garamond" 
        font-size="22" 
        font-style="italic"
        fill="#D4A857" 
        text-anchor="middle"
        letter-spacing="2">os 7 nós</text>
</svg>
```

**Cada um dos 6 highlights tem o mesmo SVG, só muda a string de texto:**

1. "os 7 nós"
2. "diagnóstico"
3. "cartas"
4. "sobre"
5. "perguntas"
6. "para mulheres"

---

## 3. HEADER TIKTOK

TikTok não tem header como Twitter/IG, mas tem o background da foto de perfil quando alguém clica.

**Foto de perfil TikTok:** mesma que Instagram (Marina-âncora).

**Bio TikTok já está em `01-bios.md`.**

---

## 4. LINK NA BIO — PÁGINA PRÓPRIA

URL: `syncehim.com/marina` ou `syncehim.com/comecar`

### Estrutura HTML (passar ao Claude Code):

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marina Vale</title>
  
  <!-- tokens.css já criado em 02-persona/assets/ -->
  <link rel="stylesheet" href="/tokens.css">
  
  <style>
    body {
      background: var(--bg-marrom-escuro, #1A1410);
      color: var(--texto-creme, #F2E8DC);
      font-family: 'EB Garamond', serif;
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .container {
      max-width: 480px;
      padding: 48px 32px;
      text-align: center;
    }
    
    .marina-foto {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 32px;
    }
    
    h1 {
      font-family: 'EB Garamond', serif;
      font-weight: 400;
      font-size: 32px;
      margin: 0 0 24px;
      color: var(--texto-creme, #F2E8DC);
    }
    
    .saudacao {
      font-size: 18px;
      line-height: 1.6;
      color: var(--texto-creme, #F2E8DC);
      margin-bottom: 24px;
    }
    
    .descricao {
      font-size: 17px;
      line-height: 1.7;
      color: var(--texto-suave, #A39B8E);
      margin-bottom: 40px;
    }
    
    .cta {
      display: inline-block;
      padding: 16px 32px;
      background: transparent;
      border: 1px solid var(--ouro-folha, #D4A857);
      color: var(--ouro-folha, #D4A857);
      text-decoration: none;
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      letter-spacing: 0.5px;
      transition: all 0.3s ease;
      margin: 0 8px 16px;
    }
    
    .cta:hover {
      background: var(--ouro-folha, #D4A857);
      color: var(--bg-marrom-escuro, #1A1410);
    }
    
    .separador {
      margin: 56px auto;
      width: 80px;
      height: 1px;
      background: var(--linha, #3A2E22);
    }
    
    .vesica {
      margin: 40px auto;
      width: 60px;
      opacity: 0.5;
    }
    
    .assinatura {
      margin-top: 56px;
      font-style: italic;
      color: var(--texto-suave, #A39B8E);
      font-size: 16px;
    }
    
    .estrela-persa {
      margin: 16px auto;
      width: 24px;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  
  <div class="container">
    
    <img src="/images/marina-ancora.jpg" alt="" class="marina-foto">
    
    <h1>Marina Vale</h1>
    
    <p class="saudacao">
      Olá. Se chegaste aqui,<br>
      é porque algo no que leste ressoou.
    </p>
    
    <p class="descricao">
      Eu escrevo sobre o que mata casamentos
      em silêncio. Há 7 nós que mulheres carregam
      sem nomear — e cada um cria uma dessincronia
      específica na sua relação.
    </p>
    
    <p class="descricao">
      Há um diagnóstico de 21 perguntas
      que te diz qual é o teu nó dominante.
    </p>
    
    <p class="descricao" style="color: var(--texto-creme); font-style: italic;">
      8 minutos. Grátis. Para sempre teu.
    </p>
    
    <a href="/diagnostico" class="cta">Fazer o diagnóstico →</a>
    
    <div class="separador"></div>
    
    <p class="descricao">
      Para receber as cartas que envio<br>
      às quartas e domingos:
    </p>
    
    <a href="/cartas" class="cta">Subscrever as cartas →</a>
    
    <!-- Vesica piscis SVG inline ou referenciado -->
    <img src="/svg/02-vesica-piscis.svg" alt="" class="vesica">
    
    <!-- Estrela persa -->
    <img src="/svg/05-estrela-persa.svg" alt="" class="estrela-persa">
    
    <p class="assinatura">
      — Marina Vale
    </p>
    
  </div>
  
</body>
</html>
```

---

## 5. BANNER/COVER PARA POSTS TWITTER (X) — opcional fase 2

Se em algum momento expandires para Twitter/X, terás de criar um banner 1500x500px.

**Conceito:** apenas a frase central da marca em letras grandes douradas sobre fundo marrom escuro, com textura pergaminho. Sem foto.

```
Os casamentos não morrem por falta de amor.
                      Morrem por dessincronia.

                            — Marina Vale
```

---

## 6. ELEMENTOS PARA STORIES (recurrent templates)

Cria 3 templates SVG reutilizáveis para stories diárias:

### Template A — "Frase do dia"

Background marrom escuro com textura. Frase centrada em EB Garamond, ouro folha 36px, com a estrela persa em cima e "— Marina Vale" em baixo.

```svg
<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1920" fill="#1A1410"/>
  
  <!-- Textura noise -->
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2"/>
    <feColorMatrix values="0 0 0 0 0.95
                          0 0 0 0 0.91
                          0 0 0 0 0.86
                          0 0 0 0.04 0"/>
  </filter>
  <rect width="1080" height="1920" filter="url(#noise)" opacity="0.4"/>
  
  <!-- Estrela persa pequena no topo -->
  <g transform="translate(540, 380) scale(0.3)">
    <!-- path da estrela persa aqui -->
  </g>
  
  <!-- Frase central -->
  <foreignObject x="120" y="700" width="840" height="500">
    <div xmlns="http://www.w3.org/1999/xhtml" 
         style="font-family: 'EB Garamond', serif; 
                font-size: 56px; 
                line-height: 1.4;
                color: #D4A857; 
                text-align: center;
                font-style: italic;">
      {{ FRASE_AQUI }}
    </div>
  </foreignObject>
  
  <!-- Assinatura -->
  <text x="540" y="1500" 
        font-family="EB Garamond" 
        font-size="28" 
        font-style="italic"
        fill="#A39B8E" 
        text-anchor="middle">— Marina Vale</text>
  
</svg>
```

### Template B — "Pergunta para ti"

Mesma estrutura, mas com a pergunta em vez da frase, e em texto creme em vez de ouro.

### Template C — "Subscrever cartas"

Convite às cartas com CTA visual.

---

## 7. LISTA COMPLETA DE ASSETS A GERAR

Para o Claude Code montar tudo no Vercel:

```
/public/perfil/
├── marina-ancora.jpg           # foto de perfil 1000x1000
├── marina-ancora-400.jpg       # versão menor para mobile
└── marina-ancora-square.jpg    # crop quadrado

/public/highlights/
├── cover-7nos.svg
├── cover-diagnostico.svg
├── cover-cartas.svg
├── cover-sobre.svg
├── cover-perguntas.svg
└── cover-mulheres.svg

/public/stories/
├── template-frase.svg
├── template-pergunta.svg
└── template-cartas.svg

/public/social/
├── og-image.jpg                 # 1200x630 para meta tags
├── twitter-card.jpg             # 1200x675
└── instagram-grid-cover.jpg     # se quiseres organizar o grid
```

Todos estes devem ser gerados **uma vez** pelo Claude Code com base nos SVGs e tokens.css que tu já tens.

---

## 8. PRINCÍPIO DE COERÊNCIA VISUAL

**Regra absoluta:** todos os elementos visuais — em qualquer plataforma — partilham:
- Fundo marrom escuro #1A1410
- Texto creme quente #F2E8DC
- Ouro folha #D4A857 apenas em destaques (assinatura, CTA, estrela persa)
- Textura pergaminho 4% noise
- EB Garamond serif para títulos e frases
- Inter sans para CTAs e metadados

Quando uma seguidora vê um post da Marina em qualquer lado — Instagram, TikTok, email, site — **reconhece imediatamente**. Esta coerência cria autoridade visual com zero esforço extra.

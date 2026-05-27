# Pipeline Completo do Carrossel Veus

**Versao:** 2026-05-27
**Repo:** `escola-veus`
**Stack:** Next.js 15 (App Router) + Supabase + Puppeteer + ffmpeg + GitHub Actions

Documentacao de arquitectura para replicar o sistema de geracao, renderizacao
e exportacao de carrosseis de conteudo editorial para redes sociais.

---

## Indice

1. [Visao geral do fluxo](#1-visao-geral-do-fluxo)
2. [Tipos de dados](#2-tipos-de-dados)
3. [Calendario anual (52 semanas)](#3-calendario-anual-52-semanas)
4. [Geracao de conteudo (Claude API)](#4-geracao-de-conteudo-claude-api)
5. [API Routes](#5-api-routes)
6. [Prompt builder MJ (Midjourney)](#6-prompt-builder-mj-midjourney)
7. [Temas e paletas](#7-temas-e-paletas)
8. [Renderizacao de slides (Puppeteer)](#8-renderizacao-de-slides-puppeteer)
9. [Montagem de video (ffmpeg)](#9-montagem-de-video-ffmpeg)
10. [Pipeline de video (GitHub Actions)](#10-pipeline-de-video-github-actions)
11. [Upload de resultados](#11-upload-de-resultados)
12. [Admin UI](#12-admin-ui)
13. [Exportacao Metricool (CSV + ZIP)](#13-exportacao-metricool-csv--zip)
14. [Schema Supabase](#14-schema-supabase)
15. [Variaveis de ambiente](#15-variaveis-de-ambiente)
16. [Dependencias externas](#16-dependencias-externas)
17. [Fluxo de dados completo](#17-fluxo-de-dados-completo)

---

## 1. Visao geral do fluxo

```
Calendario (52 briefs)
       |
       v
Claude API (tool_use) ---> Dia[] (7 dias x 6 slides, JSON)
       |
       v
Supabase DB (carousel_collections) <--- Admin UI (edita texto/tema/fundo)
       |
       v
Upload imagens MJ ---> Supabase Storage (course-assets/carrossel-veus/fundos/)
       |
       v
render-submit ---> GitHub Actions workflow
       |            |
       |            +---> Puppeteer (42 PNGs a 2160x3840)
       |            +---> ffmpeg (7 MP4s a 1080x1920)
       |            +---> Upload result (MP4+PNG -> Supabase Storage)
       |
       v
Package ZIP ---> metricool.csv + mp4/ + captions/ ---> Importar no Metricool
```

---

## 2. Tipos de dados

**Ficheiro:** `escola-veus-app/src/lib/carousel-types.ts`

### FundoFields (mixin partilhado por todos os slides)

```typescript
type FundoFields = {
  fundo?: string;        // URL publica (Supabase) da imagem MJ
  fundoClaro?: boolean;  // true = texto escuro sobre fundo claro
  decoracao?: boolean;   // manter glow/vignette por cima do fundo
  notaVisual?: string;   // override do prompt MJ
};
```

### Slide (union type)

```typescript
type SlideCapa = {
  tipo: "capa";
  linha1: string;        // frase de abertura, linha 1
  linha2: string;        // frase de abertura, linha 2
} & FundoFields;

type SlideConteudo = {
  tipo: "conteudo";
  estilo: "poetico" | "prosa";
  texto: string;         // conteudo principal (\n para quebras)
  titulo?: string;       // ex: "HABITO DA SEMANA", so num slide por dia
} & FundoFields;

type SlideCta = {
  tipo: "cta";
  icone: string;         // emoji
  recurso: string;       // nome do produto/recurso
  descricao: string;     // frase curta sobre o recurso
  url: string;           // URL do recurso
} & FundoFields;

type Slide = SlideCapa | SlideConteudo | SlideCta;
```

### Dia

```typescript
type Dia = {
  numero: number;        // 1..N
  veu: string;           // Palavra-tema do dia em maiusculas (ex: PRESENCA)
  subtitulo: string;     // Linha italic explicativa
  romano: string;        // "I / VII" (gerado automaticamente)
  slides: Slide[];       // 6 slides: capa + 4 conteudo + cta
  fundo?: string;        // fallback de fundo para todos os slides
};
```

### Colecao

```typescript
type Colecao = {
  id: string;            // UUID
  slug: string;          // URL-safe (ex: "limiar-sem-1")
  title: string;
  brief: string;         // prompt original
  dias: Dia[];           // N dias x 6 slides
  theme: Record<string, unknown>; // paleta (ex: { id: "editorial" })
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### Helpers

- `romanFor(n, total)` - converte numero em romano (ex: "III / VII")
- `slugify(s)` - gera slug URL-safe normalizado

---

## 3. Calendario anual (52 semanas)

**Ficheiro:** `escola-veus-app/src/lib/carousel-calendar.ts`

Define `ANNUAL_WEEKS: WeekSeed[]` com 52 entradas (1 por semana ISO).

```typescript
type WeekSeed = {
  week: number;          // 1..52
  monthLabel: string;    // agrupamento visual
  title: string;         // titulo sugerido
  brief: string;         // prompt para o Claude
  tag: string;           // tag visual (ex: "Lua nova", "Solsticio")
};
```

**Organizacao:**
- Semanas 1-49: Janeiro a Dezembro (temas sazonais, lunares, datas-marco)
- Semanas 50-52: bonus tematicos (ciclo menstrual, linhagem feminina, solidao)
- Linguagem universal (sem geografia especifica), estacoes descritas sensorialmente
- Tags incluem: Limiar, Pausa, Lua nova, Lua cheia, Equinocio, Solsticio, Corpo, etc.

Cada brief tem 2-4 linhas descrevendo o tema e listando os 7 "veus" sugeridos para os dias.

---

## 4. Geracao de conteudo (Claude API)

**Ficheiro:** `escola-veus-app/src/lib/carousel-generate.ts`

### Configuracao

- **Modelo:** `claude-sonnet-4-6`
- **Max tokens:** 8192 (coleccao completa), 1024 (slide individual)
- **SDK:** `@anthropic-ai/sdk`

### Funcao principal: `gerarColecaoComClaude()`

```typescript
async function gerarColecaoComClaude(opts: {
  apiKey: string;
  title: string;
  brief: string;
  numDias?: number;       // default 7
  slidesPorDia?: number;
  usedNames?: string[];   // nomes de dia a evitar (frescura entre semanas)
}): Promise<{ dias: Dia[]; usage: unknown }>
```

**Mecanismo:** Usa **tool calling** (forced tool choice) para garantir resposta
no schema exacto. A tool chama-se `save_collection` com input schema que espelha
`{ dias: Dia[] }`.

**System prompt** (resumo das regras editoriais):
- Framework dos "veus": cada veu encobre uma qualidade luminosa
- Regra critica: palavra-tema do dia SEMPRE luz, NUNCA sombra
- Lista fechada de palavras proibidas (PERDA, FERIDA, CULPA...) e recomendadas (PRESENCA, RIO, ABERTURA...)
- Subtitulo descritivo sem "Encobre X"
- Estilo: autoridade calma, sem exclamacoes, sem urgencia
- Pontuacao: NUNCA travessoes (banidos), usar pontos, dois pontos, virgulas
- Palavras a evitar: jargao new-age
- Alcance geografico universal (sem mencionar cidades/paises)
- Ecossistema de CTAs: livros, musica, LUMINA, VITALIS, cursos, comunidade
- Regras de CTA: variar entre dias, match tematico, URLs reais
- Campo `notaVisual`: 1 frase em ingles (~30-50 palavras) para prompt MJ
- Campo `fundoClaro`: boolean que determina scrim claro vs escuro

**User message template:**
```
Cria uma coleccao chamada "{title}".
Brief: {brief}
Estrutura: {numDias} dias x 6 slides cada.
[regras de nomeacao, estilo, notaVisual, fundoClaro]
[nomes proibidos das ultimas 4 coleccoes]
Chama a tool save_collection com a coleccao completa.
```

### Funcao de slide individual: `gerarSlideComClaude()`

```typescript
async function gerarSlideComClaude(opts: {
  apiKey: string;
  dia: Dia;
  slideIdx: number;      // 0-based
  hint?: string;         // instrucao do utilizador
}): Promise<{ slide: Slide; usage: unknown }>
```

Regenera UM slide preservando tipo e coerencia com o resto do dia.
Envia contexto dos outros slides no user message. Tool `save_slide` com
schema especifico por tipo (capa/conteudo/cta).

**Pos-processamento:** Apos receber a resposta, `romanFor()` e preenche
o campo `romano` automaticamente (nao pedido ao modelo).

---

## 5. API Routes

Todas em `escola-veus-app/src/app/api/admin/`.

### 5.1 POST `/api/admin/colecoes/create`

**Ficheiro:** `colecoes/create/route.ts`
**Timeout:** 300s (5 min)

**Body:** `{ title, brief, numDias?, skipClaude? }`

**Fluxo:**
1. Valida `ANTHROPIC_API_KEY`
2. Carrega nomes de dia das ultimas 4 coleccoes (evitar repeticao)
3. Se `skipClaude=true`, cria dias em branco (`blankDias()`)
4. Caso contrario, chama `gerarColecaoComClaude()`
5. Gera slug unico (com sufixo aleatorio se houver colisao)
6. Insere em `carousel_collections` via Supabase admin client
7. Retorna `{ id, slug, usage }`

### 5.2 POST `/api/admin/colecoes/[id]/regenerate-all`

**Ficheiro:** `colecoes/[id]/regenerate-all/route.ts`
**Timeout:** 300s

**Body:** `{ brief? }`

Regenera a coleccao INTEIRA com o system prompt actual. Util para
forcar uma coleccao existente a passar pela versao nova do prompt.
Preserva titulo, slug, theme, owner. Substitui o campo `dias` na DB.

### 5.3 POST `/api/admin/colecoes/[id]/regenerate-slide`

**Ficheiro:** `colecoes/[id]/regenerate-slide/route.ts`
**Timeout:** 60s

**Body:** `{ diaIdx, slideIdx, hint? }`

Carrega a coleccao, pede ao Claude para regerar UM slide preservando
o tipo. NAO persiste automaticamente. Devolve o slide novo e o cliente decide.

### 5.4 POST `/api/admin/colecoes/[id]/package`

**Ficheiro:** `colecoes/[id]/package/route.ts`
**Timeout:** 300s

**Body:** `{ startDate?, weekNumber?, year?, time?, cta? }`

Empacota tudo para publicacao:
1. Carrega a coleccao do DB
2. Encontra o render-job mais recente (por slug no Storage)
3. Para cada dia: descarrega MP4, gera captions (IG/TikTok/WhatsApp)
4. Monta ZIP: `mp4/dia-01.mp4`, `captions/dia-01-instagram.txt`, etc.
5. Gera `metricool.csv` (2 linhas por dia: IG Reel + TikTok)
6. Gera `manifest.json`
7. Upload do ZIP para `course-assets/carrossel-packages/`
8. Retorna `{ zipUrl, days, skippedDays, sizeBytes }`

### 5.5 POST `/api/admin/carrossel-veus/upload-fundo`

**Ficheiro:** `carrossel-veus/upload-fundo/route.ts`
**Timeout:** 120s

**Body:** FormData `{ file: File, slideId: string }`

Upload de imagem-fundo MJ (JPG/PNG/WebP, max 25MB) para Supabase Storage.
Caminho: `course-assets/carrossel-veus/fundos/{slideId}.{ext}`.
`slideId` formato: `veu-{dia}-slide-{n}` (ex: `veu-1-slide-3`).
Faz upsert: re-upload mantém a URL publica estavel.

### 5.6 POST `/api/admin/carrossel-veus/render-submit`

**Ficheiro:** `carrossel-veus/render-submit/route.ts`
**Timeout:** 30s

**Body:**
```json
{
  "jobId": "slug-timestamp",
  "audios": [{ "dia": 1, "slide": 1, "url": "..." }],
  "musicUrl": "...",
  "musicVolume": 0.4,
  "withoutVoice": false,
  "slideDuration": 8,
  "dias": [3],
  "content": { "campanha": "...", "dias": [...] },
  "theme": { "id": "editorial", "ink": "#26221c", ... }
}
```

**Fluxo:**
1. Valida body (audios, jobId)
2. Resolve a paleta (body.theme ou infere do slug via DB)
3. Escreve manifest JSON em `course-assets/render-jobs/{jobId}.json`
4. Escreve result inicial (status: "queued") em `render-jobs/{jobId}-result.json`
5. Dispara GitHub Actions workflow via `workflow_dispatch` (POST /repos/.../dispatches)
6. Retorna `{ jobId, manifestUrl, workflowRunUrl }`

**Variaveis de ambiente necessarias:**
- `GITHUB_DISPATCH_TOKEN` (PAT com scope `actions`)
- `GITHUB_REPO_OWNER` (default: "vivnasc")
- `GITHUB_REPO_NAME` (default: "escola-veus")
- `GITHUB_DISPATCH_REF` (default: "main")

### 5.7 GET `/api/admin/carrossel-veus/list-renders`

**Ficheiro:** `carrossel-veus/list-renders/route.ts`
**Timeout:** 30s

Lista todos os render-jobs completos (ultimos 30). Filtra por ficheiros
`*-result.json` no Storage que tenham videos com URL contendo `/carrossel-veus/`.

Retorna `{ jobs: [{ jobId, status, videos, completedAt, campanha }] }`.

---

## 6. Prompt builder MJ (Midjourney)

**Ficheiro:** `escola-veus-app/src/lib/carrossel-veus-prompt.ts`

### `buildSlidePrompt(slide, dia): string`

Monta o prompt completo para Midjourney. Prioridade:
1. `slide.notaVisual` (vem do Claude, preferido)
2. Fallback por tema do dia (`FALLBACK_TEMA_CENAS[dia.veu]`)
3. Fallback generico contemplativo

Concatena a cena com `STYLE_BASE` (estilo fixo).

### `STYLE_BASE`

Estilo editorial fixo, documentado em `docs/IDENTIDADE-VISUAL-CARROSSEL.md`:

```
editorial still life photograph, painterly boho contemplative atmosphere,
fixed palette: deep navy #1A1A2E, cream linen #E8DCC0, soft terracotta #B85C38,
raffia gold #C9A14A, cream stone #D8CFB8;
allowed materials: raw linen, navy wool serge, natural raffia weave, ...
allowed botanicals: strelitzia, palm fronds, banana leaf, monstera leaf, ...
supports: dark walnut wood, pale stone, hand-troweled cream stucco wall;
single oblique soft afternoon or morning light, gentle chiaroscuro, ...
no people, no faces, no hands, no text, no logos, no watermarks;
8k, --ar 9:16
```

### `slideAssetId(dia, slideIdx): string`

Gera ID estavel: `veu-{dia.numero}-slide-{slideIdx+1}` (usado no upload).

### Fallbacks por tema

Dicionario `FALLBACK_TEMA_CENAS` para slides legacy sem `notaVisual`:
- PERMANENCIA: agua em fluxo lento
- MEMORIA: livro numa mesa de madeira
- TURBILHAO: agua escura apos vento
- ESFORCO: cadeira vazia junto a janela
- DESOLACAO: terra revolvida ao amanhecer
- HORIZONTE: limiar de porta com luz matinal
- DUALIDADE: dois riachos a convergir

---

## 7. Temas e paletas

**Ficheiro:** `escola-veus-app/src/lib/carousel-themes.ts`

### Tipo `CarouselTheme`

```typescript
type CarouselTheme = {
  id: string;
  label: string;
  ink: string;           // cor do texto principal
  ivory: string;         // cor de fundo principal
  parchmentDark: string; // versao mais escura do ivory
  deep: string;          // fundo escuro
  deepWarm: string;      // variante quente do deep
  terracotta: string;    // acentos
  gold: string;          // dourado
  mist: string;          // rgba para overlays
  mode?: "luz" | "sombra"; // forca todos slides em modo claro/escuro
};
```

### Paletas disponiveis (array `THEMES`)

| id | label | notas |
|---|---|---|
| `editorial` | A - Editorial sobrio | cinza-quente neutro, a mais contida |
| `luz` | B - Dual modo LUZ | todos os slides em fundo claro |
| `sombra` | B - Dual modo SOMBRA | todos os slides em fundo escuro |
| `veus` | Classica (creme + ouro) | paleta original, warm |
| `maternidade` | Rosa quente | tons rosa/salmon |
| `lua` | Azul-noite | tons azul escuro |
| `dourado` | Ouro intenso | amarelo-dourado forte |
| `selva` | Verde-selva | tons verdes |

**Default:** `editorial` (primeiro da lista).

A paleta e persistida na coleccao como `theme: { id: "editorial" }` e
expandida via `themeById(id)`.

### Aplicacao no render

O `generate.js` (Puppeteer) le um `theme.json` opcional e gera CSS vars
override que sobrepoem os defaults do `styles.css`:

```css
:root {
  --ink: #26221c;
  --ivory: #f3ece0;
  --parchment-dark: #d8d0c1;
  --deep: #1a1714;
  --deep-warm: #2a2520;
  --terracotta: #8a8378;
  --gold: #b69a6e;
  --mist: rgba(243, 236, 224, 0.65);
}
```

---

## 8. Renderizacao de slides (Puppeteer)

### 8.1 Template HTML

**Ficheiro:** `carrossel-veus/template.html`

Pagina HTML autonoma que recebe dados via `window.SLIDE_DATA` (injectado
pelo Puppeteer antes do page load).

**Input esperado:**
```javascript
window.SLIDE_DATA = {
  dia: { numero, veu, subtitulo, romano, slides, fundo },
  slide: { tipo, ... },
  indiceSlide: 0  // 0-based
};
```

**Funcoes de render por tipo:**
- `renderCapa(dia, slide)` - numero ghost (720px), romano, veu, ornamentos, abertura
- `renderConteudo(dia, slide, indice)` - meta-top com marca+num, corpo poetico/prosa
- `renderCta(dia, slide)` - icon-ring, recurso, descricao, URL

**Funcoes auxiliares:**
- `fundoFor(dia, slide)` - resolve URL da imagem MJ (prioridade slide > dia)
- `bgLayer(fundo)` - `<img class="bg">` + `<div class="scrim">`
- `decor({...})` - pirilampos, sparkles, arco-iris (dia 7 especial)
- `fitToWidth(el, maxWidth, minPx)` - auto-shrink de texto para caber

**Fontes:** Google Fonts carregadas inline:
- Cormorant Garamond (serif, para titulos/poesia)
- Inter (sans-serif, para meta/corpo)
- JetBrains Mono (monospace, para URLs no CTA)

### 8.2 CSS

**Ficheiro:** `carrossel-veus/styles.css`

**Dimensoes fixas:** 1080x1920 px (9:16 vertical)

**Sistema de cores por dia:**
- CSS vars `--hue` e `--hue-deep` variam por `.dia-N` (N=1..7)
- Dia 1: rose, Dia 2: lavender, Dia 3: mint, Dia 4: sage, Dia 5: amber, Dia 6: sky, Dia 7: aurora

**Camadas decorativas:**
- `.glow-hue` - gradiente radial do hue do dia
- `.paper` - textura SVG fractal noise (simula papel)
- `.vignette-light` - moldura suave dourada
- `.fireflies` - 15 pontos luminosos posicionados por nth-child
- `.stars` / `.sparkle` - 10 estrelas com clip-path de 8 pontas
- `.rainbow-arc` - arco-iris (usado no dia 7)
- `.rainbow-strip` - faixa arco-iris topo/fundo

**Sistema de fundos MJ (`.has-bg`):**
- Activado quando slide tem `fundo` URL
- Esconde decoracoes por defeito (opt-in via `.decor`)
- Scrim escuro (default): gradiente vertical rgba(10,7,5, 0.55...0.62)
- Scrim claro (`.luz`): gradiente vertical rgba(253,248,237, 0.62...0.68)
- Texto: cores override para legibilidade (#fbf3e2 sobre escuro, var(--ink) sobre claro)
- `.ghost-num` escondido quando ha fundo

### 8.3 Gerador Puppeteer

**Ficheiro:** `carrossel-veus/generate.js`

**Processo:**
1. Le `content.json` (estrutura `{ campanha, dias: Dia[] }`)
2. Le `theme.json` (opcional, shape CarouselTheme)
3. Inicia Puppeteer (headless: "new", no-sandbox)
4. Para cada dia, para cada slide:
   a. Cria pagina nova
   b. Viewport: 1080x1920, `deviceScaleFactor: 2` (output final: 2160x3840)
   c. Injecta `window.SLIDE_DATA` via `evaluateOnNewDocument`
   d. Navega para `template.html` (file:// URL)
   e. Injecta CSS vars do tema (se existir)
   f. Espera fonts + 200ms de estabilizacao
   g. Screenshot PNG
5. Gera `output/index.html` com grid de preview

**Output:** `carrossel-veus/output/dia-{n}/veu-{n}-slide-{m}.png`

**Naming:** `veu-{dia.numero}-slide-{slideNum}.png` (slideNum 1-based)

---

## 9. Montagem de video (ffmpeg)

**Ficheiro:** `carrossel-veus/montar-videos.mjs`

**Dependencias:** `fluent-ffmpeg`, `@ffmpeg-installer/ffmpeg`

**Processo por dia:**
1. Para cada slide: renderiza segmento (PNG + audio) com duracao = voz + 1s respiracao
2. Se sem voz: duracao fixa por slide (default 8s, configuravel)
3. Aplica transicao cross-dissolve 0.5s entre slides
4. Musica de fundo com volume configuravel (default 0.4)
5. Output: H.264 + AAC, 1080x1920, 30fps

**Inputs:**
- PNGs: `output/dia-{n}/veu-{n}-slide-{m}.png`
- Audios: `audios/dia-{n}/slide-{i}.mp3` (descarregados do manifest)
- Musica: `musica.mp3` (descarregada da URL no manifest)

**Output:** `output/videos/dia-{n}.mp4`

**Env vars:**
- `MANIFEST_URL` - URL do manifest JSON com URLs dos audios
- `MUSIC_URL` - URL publica da faixa musical
- `MUSIC_VOLUME` - volume da musica (0-1, default 0.4)
- `SLIDE_DURATION` - duracao por slide sem voz (default 8s)

**Modo parcial:** Aceita argumentos CLI para renderizar so dias especificos:
```bash
node montar-videos.mjs 1 3 5  # so dias 1, 3 e 5
```

---

## 10. Pipeline de video (GitHub Actions)

**Ficheiro:** `.github/workflows/render-carrossel-veus.yml`

**Trigger:** `workflow_dispatch` com inputs `jobId` e `dias` (opcional)

**Steps:**
1. Checkout do repo
2. Setup Node 20
3. Install FFmpeg (via `FedericoCarboni/setup-ffmpeg@v3`)
4. Install dependencias Chromium (apt-get para Puppeteer)
5. `npm ci` no `carrossel-veus/`
6. Override `content.json` + `theme.json` do manifest (Supabase Storage):
   - Le `render-jobs/{jobId}.json`
   - Se tiver `.content`, substitui `content.json`
   - Se tiver `.theme`, escreve `theme.json`
7. `npm run slides` (Puppeteer gera 42 PNGs)
8. `node montar-videos.mjs {dias}` (ffmpeg gera MP4s)
9. `node tools/render-carrossel-veus/upload-result.mjs` (upload para Supabase)

**Timeout:** 60 minutos
**Runner:** `ubuntu-latest`

**Secrets necessarios:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 11. Upload de resultados

**Ficheiro:** `tools/render-carrossel-veus/upload-result.mjs`

**Processo:**
1. Le MP4s de `carrossel-veus/output/videos/`
2. Upload cada MP4 para `course-assets/carrossel-veus/{jobId}/videos/dia-{n}.mp4`
3. Escreve `render-jobs/{jobId}-result.json` com status "done" e URLs dos MP4s (CRITICO: grava antes dos PNGs para nao perder trabalho se PNGs falharem)
4. Upload PNGs para `course-assets/carrossel-veus/{jobId}/pngs/dia-{n}/`
5. Actualiza result.json com PNGs (status "done" ou "done-with-png-warnings")

**Result JSON final:**
```json
{
  "jobId": "slug-1716812345",
  "status": "done",
  "progress": 100,
  "videos": [
    { "file": "dia-1.mp4", "url": "https://...public/...", "sizeBytes": 12345678 }
  ],
  "pngs": [
    { "dia": 1, "file": "veu-1-slide-1.png", "url": "https://..." }
  ],
  "completedAt": "2026-05-27T12:00:00.000Z"
}
```

**Env vars obrigatorias:**
- `JOB_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Retry:** 3 tentativas com backoff exponencial (500ms, 1s, 2s).

---

## 12. Admin UI

### 12.1 Calendario

**Ficheiro:** `escola-veus-app/src/app/admin/producao/colecoes/calendario/page.tsx`

Grid visual das 52 semanas agrupadas por mes. Cada card mostra:
- Semana ISO, range de datas, tag
- Titulo e brief (resumo)
- Botoes: "Gerar com Claude" (chama `/create`) ou "Vazia" (skipClaude)
- Indicador se ja foi criada (link para editor)

Carrega coleccoes existentes via `/api/admin/colecoes/list`.

### 12.2 Editor de coleccao

**Ficheiro:** `escola-veus-app/src/app/admin/producao/colecoes/[id]/page.tsx`

**Funcionalidades:**
- Carrega coleccao do API por ID
- Auto-save 2s apos alteracao (PATCH `/api/admin/colecoes/{id}`)
- Regenerar slide individual (via `regenerate-slide`)
- Regenerar tudo (via `regenerate-all`, com confirmacao)
- Empacotar ZIP Metricool (via `package`)
- Selector de tema/paleta

Delega renderizacao para `CollectionWorkspace`.

### 12.3 CollectionWorkspace

**Ficheiro:** `escola-veus-app/src/components/admin/CollectionWorkspace.tsx`

Componente principal do workspace de edicao. Funcionalidades:
- Grid visual de todos os slides (preview a 18% da escala real)
- Click em slide abre `EditModal` para edicao inline
- Regeneracao individual com hint textual
- Controlo de voz (audios ElevenLabs, nao documentado aqui)
- Controlo de musica (faixas Ancient Ground no Supabase)
- Trigger de render video
- Export PNGs como ZIP (via html-to-image)
- Selector de paleta (dropdown com todas as THEMES)
- Polling do status do render-job
- Fullscreen preview de slides

**Props:**
```typescript
type CollectionWorkspaceProps = {
  title: string;
  campanha: string;
  slug: string;
  dias: Dia[];
  onDiasChange: (dias: Dia[]) => void;
  theme?: CarouselTheme;
  onThemeChange?: (theme: CarouselTheme) => void;
  onTitleChange?: (title: string) => void;
  regenerateSlideFn?: (diaIdx, slideIdx, hint?) => Promise<SlideType>;
  extraHeaderActions?: React.ReactNode;
  description?: React.ReactNode;
};
```

### 12.4 CarouselEditor (EditModal + InlineFundoControl)

**Ficheiro:** `escola-veus-app/src/components/admin/CarouselEditor.tsx`

**EditModal:** Modal de edicao por slide ou por dia.
- Se `slideIdx === -1`: edita dia (veu + subtitulo)
- Se `slideIdx >= 0`: edita campos do slide por tipo
- Campos de fundo MJ em todos os tipos: fundo URL, fundoClaro, notaVisual
- Commit so em "Guardar" (estado local ate confirmar)

**InlineFundoControl:** Controlo inline de upload de imagem MJ por slide.
Usa `/api/admin/carrossel-veus/upload-fundo` para subir a imagem.

### 12.5 Slide.tsx (React preview)

**Ficheiro:** `escola-veus-app/src/app/admin/producao/carrossel-veus/Slide.tsx`

Componente React que renderiza um slide a qualquer escala.
Replica visualmente o template Puppeteer usando JSX + inline styles.
Suporta `FundoLayer` com scrim claro/escuro para imagens MJ.

Usado no `CollectionWorkspace` para preview em tempo real.

---

## 13. Exportacao Metricool (CSV + ZIP)

### 13.1 Metricool CSV (carousel-specific)

**Ficheiro:** `escola-veus-app/src/lib/carousel-social/metricool-csv.ts`

**Tipo `CarouselPost`:**
```typescript
type CarouselPost = {
  id: string;
  date: string;           // "YYYY-MM-DD"
  time: string;           // "HH:MM"
  videoUrl: string;       // URL publica do MP4
  thumbnailUrl?: string;
  instagramCaption: string;
  tiktokCaption: string;
  tiktokTitle?: string;
};
```

**`buildCarouselCsv(posts)`:** Gera CSV com 2 linhas por dia:
- Linha IG: Instagram REEL, Show on Feed TRUE
- Linha TikTok: Privacy PUBLIC, Auto Music FALSE

**`buildCarouselCaption(opts)`:** Gera caption por plataforma:
- Instagram: texto + marca + CTA + hashtags
- TikTok: texto + #fyp + hashtags curtas
- WhatsApp: texto + marca + URL

**Hashtags base:** viviannedossantos, seteveus, escoladosveus, carrossel,
espiritualidade, despertar, consciencia, mocambique, maputo

### 13.2 CSV Header partilhado

**Ficheiro:** `escola-veus-app/src/lib/weekly-social/metricool-csv.ts`

`CSV_HEADER`: array de 93 colunas conforme formato Metricool (Planning > Calendar > Import CSV).
Suporta: Instagram, TikTok, YouTube, Facebook, Twitter/X, LinkedIn, GBP, Pinterest, Threads, Bluesky.

**`csvEscape(v)`:** Escapa aspas e delimitadores para CSV.

### 13.3 Conteudo do ZIP (gerado pela route `/package`)

```
slug-jobId.zip/
  mp4/
    dia-01.mp4
    dia-02.mp4
    ...
  captions/
    dia-01-instagram.txt
    dia-01-tiktok.txt
    dia-01-whatsapp.txt
    ...
  metricool.csv
  manifest.json
```

---

## 14. Schema Supabase

### 14.1 Tabela `carousel_collections`

**Ficheiro:** `escola-veus-app/supabase-carousel-collections.sql`

```sql
CREATE TABLE IF NOT EXISTS public.carousel_collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  brief       text NOT NULL DEFAULT '',
  dias        jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme       jsonb NOT NULL DEFAULT '{}'::jsonb,
  owner_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX carousel_collections_owner_idx
  ON public.carousel_collections (owner_id, created_at DESC);

-- Trigger: auto-update updated_at
-- RLS: deny anon (acesso todo via service role nas API routes)
```

**Campo `dias`:** array JSON com a estrutura `Dia[]` definida em `carousel-types.ts`.
**Campo `theme`:** JSON com `{ id: string }` que referencia uma paleta de `carousel-themes.ts`.

### 14.2 Storage Buckets

**Ficheiro:** `escola-veus-app/supabase-storage-buckets.sql`

Buckets definidos no SQL: `escola-videos`, `escola-workbooks`, `escola-shorts`.

O bucket principal usado pelo carrossel e **`course-assets`** (NAO definido neste
SQL, provavelmente criado manualmente ou noutro ficheiro). Estrutura:

```
course-assets/
  carrossel-veus/
    fundos/                     # imagens MJ por slide
      veu-1-slide-1.jpg
      veu-1-slide-3.png
      ...
    {jobId}/                    # outputs de cada render
      videos/
        dia-1.mp4 ... dia-7.mp4
      pngs/
        dia-1/
          veu-1-slide-1.png ... veu-1-slide-6.png
        ...
  render-jobs/
    {jobId}.json                # manifest (input para o workflow)
    {jobId}-result.json         # resultado (output do workflow)
  carrossel-packages/
    {slug}-{jobId}.zip          # ZIP Metricool final
```

---

## 15. Variaveis de ambiente

### Next.js (Vercel / escola-veus-app)

| Variavel | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API para geracao de conteudo |
| `NEXT_PUBLIC_SUPABASE_URL` | URL publica do projecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin para operacoes server-side |
| `GITHUB_DISPATCH_TOKEN` | PAT GitHub com scope `actions` (para disparar workflow) |
| `GITHUB_REPO_OWNER` | Owner do repo GitHub (default: "vivnasc") |
| `GITHUB_REPO_NAME` | Nome do repo (default: "escola-veus") |
| `GITHUB_DISPATCH_REF` | Branch para dispatch (default: "main") |

### GitHub Actions (Secrets)

| Secret | Uso |
|---|---|
| `SUPABASE_URL` | URL do Supabase (sem NEXT_PUBLIC_ prefix) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin para upload de resultados |

### montar-videos.mjs (Runtime)

| Variavel | Uso |
|---|---|
| `MANIFEST_URL` | URL do manifest JSON no Supabase Storage |
| `MUSIC_URL` | URL da faixa musical (opcional) |
| `MUSIC_VOLUME` | Volume da musica 0-1 (default: 0.4) |
| `SLIDE_DURATION` | Duracao por slide sem voz (default: 8s) |

### upload-result.mjs (Runtime)

| Variavel | Uso |
|---|---|
| `JOB_ID` | ID do render job |
| `SUPABASE_URL` | URL do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin |

---

## 16. Dependencias externas

### escola-veus-app (Next.js)

| Pacote | Versao | Uso |
|---|---|---|
| `@anthropic-ai/sdk` | - | Claude API (tool calling) |
| `@supabase/supabase-js` | - | DB + Storage |
| `jszip` | - | ZIP para exportacao Metricool |
| `html-to-image` | - | Export PNGs no browser (admin preview) |
| `next` | 15.x | App Router, API routes |
| `react` | 19.x | UI admin |

### carrossel-veus (Node.js standalone)

| Pacote | Versao | Uso |
|---|---|---|
| `puppeteer` | ^23.0.0 | Renderizar HTML -> PNG |
| `fluent-ffmpeg` | ^2.1.3 | Montar video a partir de PNGs + audios |
| `@ffmpeg-installer/ffmpeg` | ^1.1.0 | Binario ffmpeg |

### Servicos externos

| Servico | Uso |
|---|---|
| **Anthropic Claude** (claude-sonnet-4-6) | Geracao de texto + notaVisual |
| **Supabase** (Postgres + Storage) | Base de dados + storage de media |
| **GitHub Actions** | Pipeline de render (Puppeteer + ffmpeg) |
| **Midjourney** | Geracao de imagens-fundo (manual, fora do pipeline) |
| **Google Fonts** | Cormorant Garamond, Inter, JetBrains Mono |
| **Metricool** | Agendamento social (importa CSV gerado) |

---

## 17. Fluxo de dados completo

### Fase 1: Criacao de conteudo

```
1. Editora abre /admin/producao/colecoes/calendario
2. Escolhe semana e clica "Gerar com Claude"
3. Frontend -> POST /api/admin/colecoes/create { title, brief }
4. API carrega nomes usados das ultimas 4 coleccoes (Supabase DB)
5. API chama gerarColecaoComClaude() com SDK Anthropic:
   - model: claude-sonnet-4-6
   - system: SYSTEM_PROMPT (2500+ palavras de instrucoes editoriais)
   - tools: [save_collection] com schema Dia[]
   - tool_choice: forced (save_collection)
   - messages: [user: brief + regras]
6. Claude devolve tool_use com { dias: Dia[] }
7. API adiciona campo `romano` e insere em carousel_collections
8. Redirect para /admin/producao/colecoes/{id}
```

### Fase 2: Edicao e imagens

```
1. Editora ve preview de todos os 42 slides no CollectionWorkspace
2. Pode editar texto inline (EditModal) -> auto-save PATCH API
3. Pode regenerar slides individuais com hint -> POST regenerate-slide
4. Pode regenerar tudo -> POST regenerate-all
5. Pode mudar paleta (dropdown THEMES) -> auto-save
6. Para cada slide capa/cta, pode:
   a. Copiar notaVisual (prompt MJ) do slide
   b. Gerar imagem no Midjourney (externo, manual)
   c. Upload via InlineFundoControl -> POST upload-fundo
   d. Imagem aparece no preview com scrim automatico
```

### Fase 3: Render video

```
1. Editora configura: musica, volume, com/sem voz, duracao slides
2. Clica "Gerar videos" no CollectionWorkspace
3. Frontend -> POST /api/admin/carrossel-veus/render-submit
4. API escreve manifest.json + result-queued.json no Storage
5. API dispara GitHub Actions workflow via REST API
6. Workflow:
   a. Instala Node + FFmpeg + Chromium deps
   b. Le manifest do Supabase (content + theme override)
   c. Puppeteer: 42 PNGs a 2160x3840 (2x para qualidade)
   d. ffmpeg: 7 MP4s a 1080x1920 (~60s cada)
   e. upload-result.mjs: sobe MP4s + PNGs + result.json
7. Frontend faz polling do result.json ate status="done"
8. Videos ficam disponiveis para preview e exportacao
```

### Fase 4: Exportacao

```
1. Editora clica "Pacote Metricool (ZIP)"
2. Frontend -> POST /api/admin/colecoes/{id}/package
3. API:
   a. Carrega coleccao + render-job mais recente
   b. Para cada dia: descarrega MP4, gera 3 captions
   c. Monta ZIP com: mp4/ + captions/ + metricool.csv + manifest.json
   d. Upload ZIP para Supabase Storage
4. Auto-download do ZIP no browser
5. Editora importa metricool.csv no Metricool
6. MP4s usados como Reels (IG) e videos (TikTok)
7. Captions WhatsApp copiados manualmente
```

---

## Notas para replicacao

1. **O Midjourney e manual.** O pipeline gera o prompt (`buildSlidePrompt`)
   mas a imagem e criada fora do sistema e uploaded via UI.

2. **O sistema de vozes (ElevenLabs) nao esta documentado aqui.** O pipeline
   de video aceita audios pre-gerados ou modo "sem voz" com duracao fixa.

3. **O bucket `course-assets` precisa de ser criado manualmente no Supabase**
   com public=true e MIME types para JSON, imagens e video.

4. **O GitHub PAT precisa de scope `actions`** para disparar workflows via REST.

5. **A paleta do tema e injectada em 3 sitios:**
   - CSS vars no `styles.css` (default)
   - `theme.json` lido pelo `generate.js` (Puppeteer override)
   - Props do `Slide.tsx` (React preview no admin)

6. **O `content.json` original vive no repo** para a coleccao fixa "A Estacao dos Veus".
   Coleccoes dinamicas enviam o content via manifest no render-submit.

7. **Auto-save funciona com debounce de 2s** no editor. PATCH actualiza
   `dias`, `title` e `theme` na DB.

8. **Nomes de dias sao deduplicados** contra as ultimas 4 coleccoes para
   manter frescura entre semanas consecutivas.

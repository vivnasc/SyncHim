# EXPERIÊNCIA DE PRODUÇÃO DE CONTEÚDO — SyncHim

> Documento para reutilizar noutros repos. Cobre arquitectura, padrões de código, integrações, e lições aprendidas. Copiar literalmente o que servir; adaptar o resto.

---

## 1. ARQUITECTURA GERAL

```
┌─────────────────────────────────┐
│  Admin Next.js (Vercel)         │
│  /admin — editor + calendário   │
│  /api/admin/* — CRUD + dispatch │
└────────┬───────────┬────────────┘
         │ manifest  │ dispatch
         ▼           ▼
┌──────────────┐  ┌──────────────────────┐
│  Supabase    │  │  GitHub Actions      │
│  Storage     │  │  render-carrossel.yml │
│  (bus de     │  │  render-video.yml     │
│   ficheiros) │  │  (Puppeteer + FFmpeg) │
└──────┬───────┘  └──────────┬───────────┘
       │ result.json         │ upload
       ◄────────────────────►│
       │                     │
       ▼ polling             │
┌─────────────────────────────┐
│  Admin UI faz polling a     │
│  /api/admin/render-status   │
│  até status = done|failed   │
└─────────────────────────────┘
```

**Porquê GitHub Actions e não Vercel?**
Vercel tem timeout de 10-60s e não tem FFmpeg/Chromium. GitHub Actions dá 60min gratuitos, Ubuntu com apt install, e é versionado no repo. O trade-off é não haver webhook de volta — a UI faz polling a um result.json em Supabase Storage.

**Porquê Supabase Storage como bus?**
É público (o runner descarrega o manifest sem token), barato, e o upload usa a REST API com service_role key. Não precisas de S3.

---

## 2. MODELO DE DADOS

```sql
-- Um item = 1 carrossel ou 1 vídeo
content_items (
  id uuid PK,
  code text UNIQUE,          -- SC-001, SV-003
  type text,                 -- 'carousel' | 'video'
  subtype text,              -- 'kinetic-text' | 'talking-head' | 'hands-writing'
  categoria text,            -- 'didatico-A' | 'reconhecimento' | 'cta' | ...
  target text DEFAULT 'ambos', -- 'casada' | 'solteira' | 'ambos'
  title text,
  slug text,
  status text DEFAULT 'draft', -- draft → ready → rendering → rendered → published → failed
  caption text,
  hashtags text,
  platforms text[],           -- ['ig', 'tiktok', 'youtube']
  scheduled_at timestamptz,
  output_urls jsonb,          -- { pngs: [...], zip, video }
  last_job_id text,
  metadata jsonb DEFAULT '{}' -- { musicUrl, musicPrompt, youtubePlaylist, ... }
)

-- Slides de carrossel ou cenas de vídeo
content_slides (
  id uuid PK,
  item_id uuid FK → content_items,
  idx int,
  layout text,                -- 'capa' | 'conteudo' | 'cta' | 'assinatura' | 'kinetic-line'
  body text,                  -- markdown leve
  design jsonb DEFAULT '{}',  -- { numero, ornamento, fundo, acento, ... }
  voice_url text,             -- mp3 narração (vídeo)
  duration_sec numeric
)

-- Estado dos renders
render_jobs (
  job_id text PK,
  item_id uuid FK → content_items,
  kind text,                  -- 'carousel' | 'video'
  status text DEFAULT 'queued', -- queued → running → done → failed
  progress int DEFAULT 0,
  message text,
  manifest_url text,
  result_url text,
  output jsonb                -- URLs finais
)
```

---

## 3. ADMIN AUTH (simples, sem OAuth)

Padrão: allowlist de emails + password partilhada.

```
ADMIN_EMAILS=marina@x.com,vivianne@y.com
ADMIN_PASSWORD=<string longa>
```

- Login: POST /api/admin/auth/login verifica email ∈ ADMIN_EMAILS e password === ADMIN_PASSWORD.
- Cookie assinado HMAC-light (email + hash do secret).
- Diagnóstico: GET /api/admin/auth/debug retorna quais envs estão preenchidas sem expor valores.

**Lição:** Em produção, a Vercel às vezes não propaga envs novas sem redeploy. O endpoint /debug poupa horas de debugging.

---

## 4. RENDER PIPELINE — CARROSSEL (Puppeteer → PNGs)

### Template HTML estático

`tools/render-carrossel/template.html` + `styles.css`

- 1080×1350 (IG vertical), paleta em CSS vars.
- Dados injectados via `page.evaluateOnNewDocument(d => window.SLIDE_DATA = d)`.
- `document.fonts.ready` + 200ms timeout antes do screenshot.
- `deviceScaleFactor: 2` para PNGs 2× nítidos.
- Layouts: capa (bold, rosáceo), conteúdo (ghost-num), cta (centrado, ouro), assinatura (estrela).

### generate.mjs

```
1. fetch manifest JSON do Supabase
2. launch Puppeteer headless
3. para cada slide:
   - nova página (isolation)
   - evaluateOnNewDocument(slideData)
   - goto(template.html, networkidle0)
   - waitForFunction(ready)
   - screenshot → PNG
4. ZIP tudo
5. upload PNGs + ZIP para Supabase Storage
6. escreve result.json { status: 'done', output: { pngs: [...], zip } }
```

### Workflow GitHub Actions

```yaml
on: workflow_dispatch:
  inputs: { jobId, manifestUrl }
steps:
  - checkout + setup-node 20
  - apt install libs Chromium
  - npm ci + npx puppeteer browsers install chrome
  - MANIFEST_URL=${{ inputs.manifestUrl }} node generate.mjs
```

**Gotchas:**
- O Puppeteer no CI precisa de `--no-sandbox --disable-setuid-sandbox`.
- Fontes Google devem ser loaded com `display=block` (não `swap`), senão o screenshot apanha texto sem font.
- `addStyleTag` para CSS vars override DEPOIS do load (não antes).

---

## 5. RENDER PIPELINE — VÍDEO (Puppeteer + FFmpeg)

### Template kinetic

`tools/render-video/kinetic.html` — texto animado sobre fundo escuro. Mesmo padrão do carrossel mas 1080×1920 e sem deviceScaleFactor extra.

### render.mjs (FFmpeg filter graph)

```
1. Puppeteer gera 1 PNG por cena (texto estático)
2. Descarrega narrações MP3 por cena (se existirem)
3. Calcula duração: voz + 0.8s respiração, ou override, ou 3.5s
4. FFmpeg por cena:
   -loop 1 -i png -t dur
   -vf scale,crop,format,fade in/out,fps
   -c:v libx264 -crf 20
5. Concat demuxer (corte seco, -c copy)
6. Áudio: vozes com adelay cumulativo + música em loop com:
   - volume 0.18
   - afade in 2s / out 2s
   - sidechaincompress vs voz (threshold=0.04, ratio=8)
7. amix vozes + música duckada
8. Remux defensivo: -c copy -movflags +faststart
9. Upload MP4
```

**Gotchas FFmpeg:**
- `sidechaincompress` precisa de `asplit` para alimentar tanto o compress como o amix.
- `+genpts`, `avoid_negative_ts make_zero`, `vsync cfr` previnem duração louca no moov atom.
- Para `atempo` + `adelay` + `sidechaincompress` combinados, o remux defensivo é obrigatório.

---

## 6. GERAÇÃO DE VOZ (ElevenLabs TTS)

```
POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
Headers: xi-api-key, Accept: audio/mpeg
Body: { text, model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15 } }
→ MP3 binary
```

Sweet-spot para voz contemplativa PT: stability 0.55, similarity 0.8, style 0.15.

Upload para Supabase Storage: `videos/{itemId}/voice/cena-{N}.mp3`.

Estimativa de duração: `mp3.length / 16000` (128kbps ≈ 16KB/s). O runner ffprobe-a com precisão.

---

## 7. GERAÇÃO DE MÚSICA (Suno-compatible API)

```
SUNO_API_URL=https://api.sunoapi.com/api/v1
SUNO_API_KEY=
SUNO_MODEL=  (vazio = último)
```

Cliente genérico que tenta múltiplos shapes de provider:
- Geração: POST /generate { prompt, instrumental: true, duration }
- Polling: tenta 4 endpoints em ordem (/generate/record-info?taskId=X, /status/X, /generate/X, /clips/X)
- Parse defensivo: apibox shape (data.response.sunoData[].audioUrl) + flat shape (audio_url)

Presets Marina Vale:
- `pergaminho`: ambient pad, piano distante, papel
- `velas`: cordas suspensas, cello
- `silencio`: near-silent, sine tone, vento
- `travessia`: piano motif, building

Workflow: gerar → poll → descarregar MP3 → upload Supabase → guardar musicUrl em metadata do item → render.mjs lê do manifest e mixa com ducking.

---

## 8. GERAÇÃO DE COPY (Claude API)

Cliente minimalista sem SDK:

```typescript
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version: 2023-06-01
Body: {
  model: 'claude-sonnet-4-6',
  system: [{ type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } }],
  messages: [{ role: 'user', content: BRIEF }],
  tools: [SCHEMA],
  tool_choice: { type: 'tool', name: SCHEMA.name }
}
```

- `tool_choice: { type: 'tool' }` força JSON estrito sem regex parsing.
- System prompt com `cache_control: ephemeral` → 90% de desconto em re-runs.
- Few-shot curado (6 exemplos que cobrem a gama emocional) no segundo bloco.

Schema exemplo para carrossel:
```json
{
  "name": "save_carousel",
  "input_schema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "slides": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "layout": { "type": "string", "enum": ["capa","conteudo","cta","assinatura"] },
            "body": { "type": "string" }
          }
        }
      },
      "caption": { "type": "string" },
      "hashtags": { "type": "string" }
    },
    "required": ["title", "slides", "caption"]
  }
}
```

---

## 9. METRICOOL CSV EXPORT

Header oficial: 93 colunas (confirmado por upload de CSV vazio no painel Metricool, Maio 2026).

**Regras comprovadas:**
- 1 linha por (post × plataforma), NÃO 1 linha com múltiplas flags
- `Time` exige HH:MM:SS (sufixar :00)
- `Date` em YYYY-MM-DD, Metricool converte para fuso da conta
- Cada plataforma activa = "TRUE", outras = "FALSE" (não vazias)
- Vídeo MP4 vai em `Picture Url 1` (sim, "Picture")
- CRLF estrito, termina com CRLF
- `csvEscape` RFC-4180: aspas se contém vírgula, aspas, \n ou \r

**Campos obrigatórios por plataforma:**
- IG Reel: `Instagram Post Type = REEL`, `Instagram Show Reel On Feed = TRUE`
- IG Carousel: `Instagram Post Type = CAROUSEL`, slides em Picture Url 1..10
- TikTok: `TikTok Post Privacy = PUBLIC_TO_EVERYONE`, `TikTok Auto Add Music = FALSE`, `TikTok disable comments = FALSE`, `TikTok disable duet = TRUE`, `TikTok disable stitch = TRUE`
- YouTube Shorts: `Youtube Video Type = SHORTS`, `Youtube Video Privacy = PUBLIC`, `Youtube video for kids = FALSE`

**Armadilha mais insidiosa:** TikTok usa `disable_*` (não `allow_*`). A semântica é invertida.

---

## 10. PWA (Vercel)

- `public/manifest.webmanifest` com shortcuts, ícones maskable separados.
- `public/sw.js`: cache-first para estáticos, network-first para HTML com fallback `/offline`.
- `vercel.json`: headers `Service-Worker-Allowed: /` para sw.js, `Content-Type: application/manifest+json` para manifest.
- Ícones gerados via `@resvg/resvg-js` a partir de SVG (script repetível).
- PWAInstall.tsx: soft prompt Android via `beforeinstallprompt` + instrução manual iOS. Dismiss por 30 dias via localStorage.

---

## 11. MULTI-PÚBLICO (target + sub-perfil)

```
A → target='casada',   sub_perfil=null
B → target='solteira', sub_perfil='sozinha'
C → target='solteira', sub_perfil='inicio'
```

- `target` selecciona o conteúdo (casada vs solteira).
- `sub_perfil` afina a saudação e alimenta analytics.
- Content loader com fallback: se target X não tem conteúdo, cai para target oposto. Garante que o produto funciona mesmo com gaps editoriais.
- `softenForSingle()`: transform conservador (marido→ele, casamento→relação, esposa→mulher) para neutralizar copy casada. Ponto de partida editorial, não copy final.

---

## 12. CRON EMAILS (Vercel)

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/sessao-abriu", "schedule": "0 9 * * *" }] }
```

- Segurança: Vercel anexa `Authorization: Bearer <CRON_SECRET>`.
- Janela de 1 dia: sessões completadas há entre 3 e 4 dias → envia email para sessão N+1.
- Idempotente via tabela `emails_enviados` (user_id × email_kind).
- Env: `CRON_SECRET` (string longa).

---

## 13. UPSELL (Sessão 7)

Mapa de próximo nó:
```
fome → abandono
controlo → desconfianca
inferioridade → invisibilidade
desconfianca → abandono
salvadora → inferioridade
abandono → fome
invisibilidade → inferioridade
```

3 CTAs para Tier 1:
1. Atravessar próximo nó (US$ 19 / R$ 67)
2. Biblioteca completa (diferença US$ 48 / R$ 170)
3. Ficar só com este nó (sem acção)

Para Tier 2: "Refazer o diagnóstico" (próximo nó sobe quando o primeiro afrouxa).

PayPal `tier='upgrade'` na API → `custom_id` grava `tier=1` para o `applyPurchase` adicionar a `nos_comprados_adicionais`.

---

## 14. ENVS COMPLETAS

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=synchim-assets

# PayPal
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=

# Resend
RESEND_API_KEY=
RESEND_FROM="Marina <marina@dominio>"

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Admin
ADMIN_EMAILS=email1,email2
ADMIN_PASSWORD=

# GitHub Actions dispatch
GITHUB_DISPATCH_TOKEN=   # PAT classic, scopes: repo + workflow
GITHUB_REPO_OWNER=
GITHUB_REPO_NAME=
GITHUB_DISPATCH_REF=main

# ElevenLabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2

# Suno
SUNO_API_URL=https://api.sunoapi.com/api/v1
SUNO_API_KEY=
SUNO_MODEL=  # vazio = último

# Claude
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6

# Cron
CRON_SECRET=

# Preços
PRICE_TIER1_USD=39.00
PRICE_TIER2_USD=87.00
PRICE_UPGRADE_NO_USD=19.00
PRICE_UPGRADE_NO_BRL=67
PRICE_TIER2_DIFF_USD=48
PRICE_TIER2_DIFF_BRL=170
```

---

## 15. FICHEIROS PARA COPIAR LITERALMENTE

```
src/lib/admin/auth.ts              admin auth (allowlist + cookie HMAC)
src/lib/admin/storage.ts           upload/read JSON em Supabase Storage
src/lib/admin/dispatch.ts          workflow_dispatch GitHub Actions
src/lib/admin/claude.ts            Claude API Messages sem SDK
src/lib/admin/suno.ts              Suno API multi-provider
src/lib/admin/metricool/csv.ts     93-col header + csvEscape + helpers
src/lib/admin/metricool/builders.ts  buildCarouselRow + buildVideoRows
src/lib/admin/soften-for-single.ts   neutralizar copy casada→ambos
src/lib/admin/brand.ts             tokens de marca partilhados

tools/render-carrossel/            Puppeteer → PNGs (template + styles + generate.mjs)
tools/render-video/                Puppeteer + FFmpeg → MP4 (kinetic.html + render.mjs)

.github/workflows/render-carrossel.yml
.github/workflows/render-video.yml

scripts/generate-pwa-icons.mjs     SVG → PNG via @resvg/resvg-js
scripts/import-knot-content.mjs    classifica .md por header e distribui em content/
scripts/strip-em-dashes.mjs        pass anti-travessão em copy editorial

supabase/admin-schema.sql          tabelas content_items/slides/jobs/admins
```

---

## 16. ORDEM PARA CONSTRUIR NOUTRO REPO

1. **Supabase:** criar bucket público + aplicar schema.
2. **GitHub repo + workflow esqueleto:** 1 workflow_dispatch que recebe jobId, faz echo e escreve result. Provar dispatch end-to-end antes de meter Puppeteer/FFmpeg.
3. **Next.js + admin auth:** login por allowlist, layout com sidebar, /debug endpoint.
4. **Endpoint submit:** gera manifest, sobe Supabase, chama GitHub dispatch, cria render_job. Polling endpoint lê result.json.
5. **Render script local:** prova com manifest mock num laptop antes de meter no CI.
6. **Meter render no workflow:** apt install ffmpeg/puppeteer libs, descarrega manifest, corre script.
7. **Integrações:** Claude para copy, ElevenLabs para voz, Suno para música. Cada uma é independente.
8. **Metricool CSV:** copiar csv.ts + builders.ts, adaptar campos por plataforma.
9. **PWA + cron + polish:** últimos 10%.

---

## 17. LIÇÕES APRENDIDAS

1. **Vercel não bundla ficheiros arbitrários.** `fs.readFile('assets/...')` falha em serverless. Solução: importar como string via webpack rule `.md → asset/source`, ou usar `outputFileTracingIncludes`.

2. **Vercel não activa envs sem redeploy.** Adicionar env → obrigatório redeployar. O /debug endpoint poupa horas.

3. **Metricool TikTok usa `disable_*`, não `allow_*`.** A semântica é invertida vs a documentação antiga.

4. **FFmpeg `sidechaincompress` + `atempo` + `adelay`** produz duração corrompida no container. Remux defensivo (`-c copy -movflags +faststart`) obrigatório.

5. **Puppeteer screenshots antes de `document.fonts.ready`** capturam texto sem a font correcta. Esperar fonts + 200ms extra para gradientes/emojis estabilizarem.

6. **O admin layout no Next.js App Router NÃO deve ter `<html>/<body>` próprios** se estiver nested no root layout. Causa hydration mismatch.

7. **Copy para dois públicos: neutralizar em vez de duplicar.** Um item com `target='ambos'` serve melhor do que dois items espelhados que divergem editorialmente ao longo do tempo.

8. **Marina Vale é 100% AI.** Não ter preconceito sobre a origem dos assets (B-roll, música, voz). O que importa é a coerência da voz editorial.

9. **A editora não vai preencher formulários.** O fluxo deve ser: gerar via AI → mostrar preview → aprovar/regerar. Não pedir título, categoria, A/B/C.

10. **Commit incremental, push incremental.** O utilizador testa em produção em paralelo. Cada commit deve buildar.

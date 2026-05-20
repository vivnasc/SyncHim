# SyncHim · Estúdio (admin)

Painel de produção de conteúdo para Instagram, TikTok e YouTube. Vive em
`/admin` (fora do roteamento i18n; o middleware deixa passar). Acesso
controlado por allowlist de emails + password partilhada.

## Mapa rápido

```
/admin                       → painel (contagens + jobs recentes)
/admin/carrosseis            → 60 carrosséis
/admin/carrosseis/novo       → criar carrossel em branco
/admin/carrosseis/[id]       → editor + render Puppeteer
/admin/videos                → vídeos (kinetic / talking / hands)
/admin/videos/[id]           → editor + voz ElevenLabs + render FFmpeg
/admin/calendario            → 4 semanas, agendamento
/admin/render-jobs           → histórico
```

## Arquitectura (idêntica ao padrão Escola dos Véus)

```
Editor Next.js (/admin)
        │
        │  manifest JSON
        ▼
Supabase Storage  (synchim-assets / render-jobs/<jobId>.json)
        │
        │  workflow_dispatch
        ▼
GitHub Actions runner
   ├─ render-carrossel.yml   (Puppeteer → PNGs → ZIP)
   └─ render-video.yml       (Puppeteer + FFmpeg → mp4)
        │
        │  upload
        ▼
Supabase Storage  (output + result.json status)
        │
        ▼  polling
Editor Next.js   → preview + publicação manual
```

A UI faz polling a `/api/admin/render-status?jobId=` que lê o
`*-result.json` em Supabase. Não há webhook GitHub→Cloudflare.

## Setup

1. **Schema:** aplicar `supabase/admin-schema.sql` no painel Supabase.
2. **Bucket:** criar `synchim-assets` (público) em Supabase Storage.
3. **GitHub Secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. **Env (`.env.local` + Cloudflare Pages):**
   - `ADMIN_EMAILS` (lista separada por vírgula)
   - `ADMIN_PASSWORD` (string longa — autentica + assina cookie)
   - `SUPABASE_STORAGE_BUCKET=synchim-assets`
   - `GITHUB_DISPATCH_TOKEN` (PAT classic com `repo` + `workflow`)
   - `GITHUB_REPO_OWNER=vivnasc` · `GITHUB_REPO_NAME=SyncHim` · `GITHUB_DISPATCH_REF=main`
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL`
   - `ANTHROPIC_API_KEY` (para geração de copy — não usado nesta v1)
5. **Seed:** abrir `/admin` e clicar em "Importar markdown (60 carrosséis)"
   ou `POST /api/admin/seed` (admin auth). Faz parsing dos ficheiros em
   `assets/insta-60-carrosseis/insta-60-carrosseis/*.md`.

## Modelo de dados

`synchim.content_items` (1 carrossel ou 1 vídeo)
`synchim.content_slides` (slides/cenas, ordenadas por idx)
`synchim.render_jobs` (estado de cada workflow disparado)

`design jsonb` nos slides permite alargar sem migrações: ornamento,
numero ghost, override de paleta por slide, etc.

## Estender

- **Talking-head real:** quando houver assets de Marina em vídeo, trocar
  o template kinetic por composite Puppeteer + clip de fundo no FFmpeg.
- **Geração com Claude:** adicionar `/api/admin/generate-copy` que pega
  no system prompt da Marina + tool calling para devolver JSON estrito
  (ver padrão Véus em `escola-veus-app/src/lib/carousel-generate.ts`).
- **Metricool CSV:** exportar agendamento → CSV no formato Metricool.
- **Legendas burned-in:** Scribe STT (ElevenLabs) → SRT → `subtitles=`
  no FFmpeg (já provado nos Véus, replicar quando vídeos tiverem voz).

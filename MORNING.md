# SyncHim · estado para a manhã

> Trabalho da noite na branch `claude/build-synchim-admin-page-sBwTh`.
> Todos os builds (`tsc --noEmit` + `next build`) passam. Pronto para testes.

## Resumo

1. **Admin de produção de conteúdo** (`/admin`) — carrosséis + vídeos com
   pipeline GitHub Actions + Puppeteer (PNGs) e FFmpeg (vídeo). Painel,
   editores, calendário, render jobs. Seed dos 60 carrosséis do markdown.
2. **Exportador Metricool** (`/admin/metricool`) — 93 colunas oficiais
   confirmadas via `csv_data.csv`. Gera CSV pronto para Import CSV.
3. **Expansão para solteiras** — diagnóstico, perguntas e resultado
   agora têm variante `solteira` (mantendo scoring idêntico). Picker na
   primeira tela do diagnóstico + atalho na landing.
4. **PWA completo** — manifest, service worker offline-first, ícones
   192/512/maskable + apple-touch, install prompt soft, página /offline.

## Passos para activar em produção

### 1. Supabase (uma vez)

No SQL editor, correr por ordem:

```sql
-- já existente: supabase/schema.sql
-- novo:
\i supabase/admin-schema.sql
\i supabase/target-migration.sql
```

Depois, em *Project Settings → API → Exposed schemas* garantir que
`synchim` continua na lista. Criar bucket público `synchim-assets` em
Storage.

### 2. GitHub Secrets do repo

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — usados pelos workflows de
render.

### 3. Cloudflare Pages env vars (Production + Preview)

Adicionar ao já existente:

```
ADMIN_EMAILS=marina@…,vivianne@…
ADMIN_PASSWORD=<string longa>
SUPABASE_STORAGE_BUCKET=synchim-assets
GITHUB_DISPATCH_TOKEN=<PAT classic com scopes repo + workflow>
GITHUB_REPO_OWNER=vivnasc
GITHUB_REPO_NAME=SyncHim
GITHUB_DISPATCH_REF=main
ELEVENLABS_API_KEY=<para TTS dos vídeos>
ELEVENLABS_VOICE_ID=<voz Marina>
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2
ANTHROPIC_API_KEY=<para futura geração de copy>
```

### 4. Build & deploy

```
npm run build:cf
npx wrangler pages deploy .vercel/output/static
```

## Checklist de testes (10 minutos)

- [ ] Abrir `/pt` → ver hero. Carregar **"começar como solteira"** →
  vai para `/pt/diagnostico?for=solteira`.
- [ ] Clicar **"começar agora"** no intro → 21 perguntas com framing
  "solteira" (q1 "Quando ele demora a responder…").
- [ ] Voltar a `/pt` e abrir **"começar agora"** principal → 21 perguntas
  framing "casada" (q1 com "ele" no contexto de marido).
- [ ] No mobile Android, em Chrome: aparece o soft-prompt "Instalar
  SyncHim" depois de uns segundos. Aceitar → app na home screen.
- [ ] Em iOS Safari: aparece a instrução manual "Toca em Partilhar
  → Adicionar ao ecrã principal".
- [ ] Desligar a rede e recarregar uma página já visitada → fallback
  para `/offline`.
- [ ] `/admin/login` com `ADMIN_EMAILS` + `ADMIN_PASSWORD` → entra.
- [ ] `/admin` → carrega o painel.
- [ ] Clicar **"Importar markdown (60 carrosséis)"** → vai para a lista
  preenchida.
- [ ] Abrir um carrossel → editar slide → segue auto-save.
- [ ] Clicar **"Gerar PNGs"** → workflow GitHub Actions dispara,
  estado fica "rendering", uns minutos depois "rendered" com links.
- [ ] `/admin/metricool` → seleccionar items renderizados → descarregar
  CSV → import no painel Metricool.

## O que NÃO foi feito (consciente)

- Tier 1 (sessões pagas) ainda está em copy "casada". Reescrever a
  travessia para "solteira" é trabalho editorial de várias horas e
  exige a tua revisão. Recomendado: validar a voz com o Tier 0 primeiro.
- Emails Resend não foram tocados — o `boas_vindas_t0` é genérico o
  suficiente para servir ambos os públicos sem reescrita imediata.
- Talking-head real para vídeos (Marina é "sem rosto" por design) usa
  o mesmo template kinetic; quando quiseres assets distintos, edita
  `tools/render-video/kinetic.html`.
- Geração de copy via Claude API ficou como hook (`ANTHROPIC_API_KEY`
  no env) mas o endpoint `/api/admin/generate-copy` não foi implementado.

## Como reverter

A branch está separada da `main`. Para descartar:

```
git checkout main
git branch -D claude/build-synchim-admin-page-sBwTh
```

Nada na main foi tocado.

## Onde está o quê

```
src/lib/target.ts                       público (casada|solteira)
src/lib/diagnostic-variants.ts          21 perguntas em variante solteira
src/lib/no-content-variants.ts          7 nós com copy solteira (Tier 0)
src/lib/admin/                          libs admin (auth, dispatch, storage)
src/lib/admin/metricool/                CSV header oficial + builders
src/app/admin/                          UI admin
src/app/api/admin/                      APIs admin
src/components/DiagnosticForm.tsx       picker + 21 perguntas
src/components/PWAInstall.tsx           prompt + register SW
public/sw.js                            service worker
public/manifest.webmanifest             PWA manifest
public/icons/                           ícones rasterizados
scripts/generate-pwa-icons.mjs          regenera ícones de src/app/icon.svg
tools/render-carrossel/                 Puppeteer → PNGs
tools/render-video/                     Puppeteer + FFmpeg → MP4
.github/workflows/render-carrossel.yml
.github/workflows/render-video.yml
supabase/admin-schema.sql               tables: content_items/slides/jobs
supabase/target-migration.sql           adiciona coluna target
```

Boa noite.

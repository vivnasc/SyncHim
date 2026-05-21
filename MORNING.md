# SyncHim · estado para a manhã (Vercel)

> Branch: `claude/build-synchim-admin-page-sBwTh`.
> Stack confirmada: **Vercel + Supabase + GitHub Actions** (sem Cloudflare).
> `tsc --noEmit` e `next build` passam.

## O que foi feito esta noite

1. **Migração CF → Vercel**
   - removidos `wrangler.jsonc`, `open-next.config.ts`, scripts `build:cf` e `preview`
   - removida devDep `@opennextjs/cloudflare` + `wrangler`
   - `next.config.mjs` com `remotePatterns` Supabase
   - middleware lê `x-vercel-ip-country` (com fallback para `request.geo` e o antigo `cf-ipcountry`)
   - `vercel.json` com headers correctos para `/sw.js`, `/manifest.webmanifest`, `/icons/*`

2. **Admin de produção (`/admin`)** — carrosséis + vídeos + Metricool, com **dimensão `target`** em cada item:
   - `casada` (default), `solteira`, ou `ambos`
   - filtro no painel, listas, calendário e exportador Metricool
   - botão **duplicar como solteira** em cada editor: copia o item, aplica `softenForSingle` (marido → ele, casamento → relação, etc.) como ponto de partida editorial
   - todas as APIs (`/api/admin/*`) aceitam e devolvem `target`

3. **Expansão para solteiras no produto**
   - 21 perguntas em variante solteira (PT + EN) mantendo scoring idêntico
   - 7 nós com `lead/body/fraseQueDoi` reescritos
   - picker no diagnóstico + atalho `?for=solteira` na landing
   - target propagado via cookie + URL + DB

4. **PWA**
   - manifest, service worker offline-first, ícones 192/512/maskable + apple-touch
   - install prompt soft (Android via `beforeinstallprompt`, iOS instrução manual)
   - página `/offline` (não-i18n)

5. **Polish CSS** — safe-area, focus-visible, skeleton, page-in animation, spinner `aria-busy`, scrollbar dourada, ::selection, alvos ≥ 44px mobile.

---

## Passos para activar em produção

### 1. Supabase (uma vez)

SQL editor, por ordem:

```
\i supabase/admin-schema.sql
\i supabase/target-migration.sql
\i supabase/content-target-migration.sql
```

Em *Project Settings → API → Exposed schemas* garantir que `synchim` continua na lista.

Em *Storage*, criar bucket público **`synchim-assets`**.

### 2. GitHub Secrets do repo

Settings → Secrets and variables → Actions:

| nome | valor |
|---|---|
| `SUPABASE_URL` | URL do projecto |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |

### 3. Vercel · Environment variables

Settings → Environment Variables (Production + Preview):

```
NEXT_PUBLIC_SITE_URL=https://synchim.vercel.app   # ou domínio próprio
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
RESEND_API_KEY=...
RESEND_FROM="Marina <marina@dominio>"
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...
PRICE_TIER1_USD=39.00
PRICE_TIER2_USD=87.00
PRICE_UPGRADE_NO_USD=19.00

# Admin de produção
ADMIN_EMAILS=marina@…,vivianne@…
ADMIN_PASSWORD=<string longa, ex 32+ chars>
SUPABASE_STORAGE_BUCKET=synchim-assets

# GitHub workflow dispatch
GITHUB_DISPATCH_TOKEN=<PAT classic com scopes repo + workflow>
GITHUB_REPO_OWNER=vivnasc
GITHUB_REPO_NAME=SyncHim
GITHUB_DISPATCH_REF=main

# ElevenLabs (TTS para vídeos com narração)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_TTS_MODEL=eleven_multilingual_v2

# (futuro) geração com Claude
ANTHROPIC_API_KEY=...
```

### 4. Deploy

```bash
vercel --prod
# ou git push origin main → auto-deploy via GitHub integration
```

---

## Passos de teste (12 minutos)

### A. Diagnóstico — casada (3 min)
1. Abrir `/pt` → ver hero "O teu marido afastou-se".
2. Clicar **começar agora** (CTA principal) → `/pt/diagnostico`.
3. Clicar **começar** no intro → picker aparece como primeira tela.
4. Escolher **Num casamento**.
5. Responder as 21 perguntas (devem ter framing "marido/casamento").
6. Email/nome/consent → submit → `/pt/resultado` com copy de marido.

### B. Diagnóstico — solteira (3 min)
1. Voltar a `/pt`.
2. Carregar no link discreto **começar como solteira** (abaixo do hero).
3. URL deve ser `/pt/diagnostico?for=solteira`.
4. Clicar **começar** → picker pré-seleccionado.
5. Responder. Perguntas devem ter framing "homens que conheces, esfriam" em vez de marido.
6. Resultado deve mostrar copy variante (sem "marido" nem "casamento").

### C. PWA (2 min)
1. Em **Chrome desktop ou Android**: depois de uns segundos no site, vê o card "Instalar SyncHim" em baixo à direita.
2. Carregar **instalar** → app abre standalone.
3. Em **iOS Safari**: aparece a instrução manual *Partilhar → Adicionar ao ecrã principal*.
4. DevTools → Network → throttling **Offline** → recarregar uma página visitada → fallback para `/offline` (não 404).

### D. Admin — carrosséis + duplicar (2 min)
1. `/admin/login` com `ADMIN_EMAILS[0]` + `ADMIN_PASSWORD`.
2. `/admin` → painel mostra contagens por estado **e por público** (casadas / solteiras / ambas).
3. `/admin/carrosseis` → clicar **Importar 60 carrosséis do markdown** (cria os 60 originais marcados `casada`).
4. Abrir um carrossel → ver chip "público: casada" no topo.
5. Clicar **duplicar como solteira →**. Vai abrir o novo item (status: draft, com texto amaciado).
6. Confirmar que o original continua intacto.
7. Voltar a `/admin/carrosseis?target=solteira` → aparece o item duplicado.

### E. Admin — render carrossel + Metricool (2 min)
1. Num carrossel pronto, clicar **Gerar PNGs (Puppeteer)** → estado vai para `rendering`.
2. Em outro tab abrir GitHub → Actions → ver o workflow **Render carrossel SyncHim** a correr.
3. Quando terminar (1-3 min), o editor mostra os PNGs e o link do ZIP.
4. `/admin/metricool` → o item aparece na lista.
5. Filtro "só solteiras" → mostra só esses.
6. Carregar **↓ Descarregar CSV** → ficheiro com 93 colunas válido.

---

## Onde está o quê

```
src/lib/target.ts                       público (casada|solteira)
src/lib/diagnostic-variants.ts          21 perguntas em variante solteira
src/lib/no-content-variants.ts          7 nós com copy solteira (Tier 0)
src/lib/admin/                          libs admin (auth, dispatch, storage, soften, brand)
src/lib/admin/metricool/                CSV header oficial + builders
src/app/admin/                          UI admin (com selector + duplicar)
src/app/api/admin/                      APIs admin
src/app/api/admin/items/[id]/duplicate  duplica para outro público
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
supabase/target-migration.sql           users + diagnosticos.target
supabase/content-target-migration.sql   content_items.target
vercel.json                             headers para PWA
```

## O que ficou deliberadamente de fora

- **Tier 1 (sessões pagas)** continua em copy "casada". Os 7 nós no Tier 0 foram adaptados, mas reescrever sessões 3-7 do nó fome para "solteira" é trabalho editorial significativo e exige a tua voz. Recomendo validar a recepção do Tier 0 solteira antes.
- **Emails Resend** não foram tocados. `boas_vindas_t0` é genérico o suficiente.
- **`softenForSingle` não é um tradutor**. Aplica substituições conservadoras como ponto de partida — a editora revê sempre antes de marcar `ready`.
- **Talking-head real** (Marina sem rosto por design) usa template kinetic; quando houver assets, troca em `tools/render-video/kinetic.html`.

## Reverter

```
git checkout main
git branch -D claude/build-synchim-admin-page-sBwTh
```
A `main` não foi tocada.

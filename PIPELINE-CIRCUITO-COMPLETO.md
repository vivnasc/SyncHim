# Pipeline · Circuito completo da produção (SyncHim)

> **Para a outra Claude session:** isto não é uma sugestão. É a arquitectura
> que está a funcionar em produção. Antes de propor mudanças, lê todas as
> 6 secções. Se quiseres mudar algo estrutural, justifica em comentário no
> PR — não reescrevas em silêncio.
>
> Última actualização: 2026-05-28 fim-do-dia. Estado: **CAMPANHA COMPLETA
> EM PRODUÇÃO — 140 posts agendados em Metricool**, 30 dias de conteúdo
> a ser publicado IG + TikTok.

---

## 0. Caso comprovado — 2026-05-28

**O que se conseguiu em ~12 horas:**

| Métrica | Valor |
|---|---|
| Carrosseis na campanha | 130 (~70 originais + 60 seed importado) |
| Posts agendados no Metricool | 140 (carrossel × IG/TikTok) |
| Dias de conteúdo cobertos | 30 |
| Imagens geradas via Replicate | ~140 (custo ~$5) |
| Imagens reusadas da biblioteca | ~40 ($0) |
| Slides totais | ~1000 |
| Render jobs GH Actions | ~70 (≈5min total em paralelo) |
| Build Vercel consumido (hobby tier) | $0.65 / $20 |
| Tempo total de iteração | 12h (de "Load failed" a 140 posts) |

**Stack final em produção:**
- Next.js 14 App Router · Vercel · Supabase (auth + Storage + Postgres)
- Anthropic Claude `claude-sonnet-4-6` (texto via tool-use)
- Replicate Flux 1.1 Pro (imagens cinematográficas)
- GitHub Actions ubuntu-22.04 (Puppeteer render)
- Metricool (agendamento publicação IG + TikTok)

**Marcos visuais validados pela Vivianne (a marca):**
- Imagem domina 62% do slide, gradiente bridge suave (estilo FreeMe)
- Tipografia EB Garamond 600-800 weight, 124px conteúdo
- Estrela persa oficial em SVG (não unicode)
- Paleta bordeaux→escuro com acento rosa #E08496
- Sem caras close-up nas imagens — pessoas em interacção

---

## 1. Resumo do circuito em 1 imagem

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  PLANEAR              GERAR              RENDER         PUBLICAR   │
│  ┌─────────┐         ┌──────────┐       ┌───────┐      ┌────────┐  │
│  │ /admin  │         │ Claude   │       │ GH    │      │Metric- │  │
│  │ planear │ ──────► │ +        │ ────► │Action │ ───► │ ool    │  │
│  │         │         │ Replicate│       │Pupp.  │      │ CSV    │  │
│  └─────────┘         └──────────┘       └───────┘      └────────┘  │
│       │                   │                 │              │       │
│       ▼                   ▼                 ▼              ▼       │
│  campaign_jobs       content_items      render_jobs    output_urls │
│  (background)        + content_slides   (GH dispatch)  (PNG+ZIP)   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Tudo em SUPABASE                     Run em GITHUB ACTIONS    Storage:
(content_items, content_slides,      (runners ubuntu-22.04,   synchim-assets
 render_jobs, campaign_jobs)          Puppeteer + FFmpeg)     (público)
```

**6 estados** que um `content_item` percorre:
`draft → ready → rendering → rendered → published`. Mais o ramo de saída
`failed` em qualquer momento, e o ramo de pausa `archived` (via
`metadata.archived=true` + `scheduled_at=2099-12-31`).

---

## 2. Detalhe por fase

### Fase 1 · Planear (gerar texto + image prompts)

**Página:** `/admin/planear` (1 página, 4 secções na ordem do fluxo).

**O que faz:** chama a Claude com tool-use forçado (`save_carousel`) que
devolve `{ title, slides[], caption, hashtags }`. Cada slide é
`{ layout, body, imagePrompt }`.

**Inputs do user:**
- Data inicial (segunda)
- Duração (1 / 2 / 4 / 5 semanas)
- Modo teste (default ligado, gera só 3)
- Estratégia de imagens (always-new / prefer-existing / reuse-only)
- Modelo Replicate (Flux 1.1 Pro / Schnell)
- Auto-imagens (gerar imagens no fim do texto)

**2 modos de execução:**
- **No browser** — loop client-side `for(i=0;i<70;i++) fetch('/api/admin/plan-week')`. Bom para 1 semana ou debug. Limitação: fechas browser, pára.
- **Background** — botão **"Planear em background ⤤"** dispara workflow
  `plan-campaign.yml` em GitHub Actions. Cria row em `campaign_jobs`,
  o workflow chama `/api/admin/campaigns/process-slot` para cada slot.
  Browser pode fechar. Status em `/admin/campaign-jobs/{id}` (poll 4s).

**Validações:**
- Post-validação `validateImageCoverage()`: capa OBRIGATORIAMENTE com
  imagePrompt + último slide (cta/assinatura) OBRIGATORIAMENTE com
  imagePrompt + pelo menos 2 conteúdos com imagePrompt. Mínimo 4/8.
- Se falhar: retry automático 1× com mensagem reforçada.

**Outputs:**
- N rows em `content_items` (status=draft, scheduled_at em CAT/Maputo)
- ~8 rows por carrossel em `content_slides`
- Códigos sequenciais `SC-XXX` (nunca reset)

**Setup necessário:**
- `ANTHROPIC_API_KEY` (Vercel env)
- `CAMPAIGN_TZ_OFFSET=+02:00` (Maputo CAT)
- Para background: `CAMPAIGN_WORKER_TOKEN` (Vercel + GitHub secret idênticos)

### Fase 2 · Gerar imagens (Replicate)

**Onde:** integrada na Fase 1 quando `autoImages=true`. Pode também correr
isolada via botão **"Gerar imagens em falta (N)"** no editor de cada
carrossel, OU botão por slide **"Gerar imagem (Replicate)"**.

**Endpoint:** `POST /api/admin/generate-images`
- `{ itemId, reuseStrategy }`
- 3 estratégias:
  - `prefer-existing` — pool primeiro, gera nova se não houver match
  - `always-new` — sempre gera, ignora pool. **Default** durante fase 1
    da campanha (constrói o pool para semana 6+).
  - `reuse-only` — pool only, slides sem match ficam texto-puro

**Pool de reuso (`src/lib/admin/image-pool.ts`):**
- Match por `(layout, categoria)` com agrupamento: didáticos A/B/C/D
  partilham pool. Reconhecimento e CTA têm o seu.
- **Dedupe por URL** antes do random pick — imagens populares pesam
  igual a imagens novas.

**Custos:**
- Flux 1.1 Pro: $0.04/img (~15s)
- Flux Schnell: $0.003/img (~4s)
- Sempre mostra estimativa no card "Estimativa" antes do user carregar.

**Outputs:**
- PNG em `synchim-assets/carrosseis/{itemId}/slide-XX.png`
- URL em `content_slides[i].design.imageUrl`
- `design.reused = true` se veio do pool

**Setup necessário:**
- `REPLICATE_API_TOKEN` (Vercel)
- `REPLICATE_MODEL=black-forest-labs/flux-1.1-pro` (default)
- Bucket Supabase Storage **público**

### Fase 3 · Render (Puppeteer compõe texto+imagem em PNG final)

**Onde:** botão **"Render bulk (draft)"** ou **"render N"** por semana no
painel, OU **"Gerar PNGs"** individual no editor de cada carrossel.

**Endpoints:**
- `POST /api/admin/carrosseis/{id}/render` — single
- `POST /api/admin/carrosseis/bulk-render` — `{ codeFrom, codeTo, status, weekStart, confirm }`

**Helper partilhado:** `src/lib/admin/render-dispatch.ts`
`dispatchCarouselRender(itemId)`:
1. Lê item + slides do Supabase
2. Constrói manifest JSON
3. Upload manifest para `render-jobs/{jobId}.json`
4. Insere row em `render_jobs` (status=queued)
5. Marca `content_items.status='rendering'` + `last_job_id`
6. Dispara workflow `render-carrossel.yml`

**Workflow GitHub Actions** (`.github/workflows/render-carrossel.yml`):
- `runs-on: ubuntu-22.04` (NUNCA `ubuntu-latest` — Noble tem
  packages `-t64` que partem o apt install)
- `setup-node@v4` SEM `cache: npm` (lockfile está no .gitignore — se
  metas cache, falha com `Some specified paths were not resolved`)
- apt install Chromium libs + Puppeteer
- `node generate.mjs` que:
  - Descarrega manifest
  - Para cada slide: abre `template.html`, injecta SLIDE_DATA, screenshot
  - Empacota PNGs num ZIP
  - Upload PNGs + ZIP + result.json para Storage

**Template** (`tools/render-carrossel/template.html`):
- 1080×1350 vertical
- Paleta SyncHim: bg #1A1410, bg-top bordeaux #5A1A2A, texto #F2E8DC,
  acento rosa #E08496
- 3 modos: `split` (imagem 62%/texto 42%), `full` (imagem 100% com
  darkening), `text` (sem imagem, centrado)
- Tipografia EB Garamond 600-800 weight, 124px conteúdo/134 capa
- Marca top-left com EstrelaPersa SVG oficial (NÃO unicode `✦`)
- Crédito bottom-left `© viviannedossantos`
- Paginação bottom-center
- Número fantasma em conteúdo texto-puro

**Quando o runner morre antes do upload de result.json:** UI fica em
`rendering` para sempre. Solução: botão **"Sincronizar status com
GitHub Actions"** no painel varre `render_jobs` em queued/running e
actualiza com base no que está em Storage.

**Setup necessário:**
- `GITHUB_DISPATCH_TOKEN` (PAT classic com scope `repo`+`workflow`,
  OU fine-grained com Actions: Read/Write)
- `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_DISPATCH_REF=main`
- GitHub secrets: `SUPABASE_URL`, `SYNCHIM_SUPABASE_SERVICE_ROLE_KEY`

### Fase 4 · Publicar via Metricool

**Página:** `/admin/metricool`

**O que faz:** lê todos `content_items` com `status in (rendered,
published, ready)` que tenham `output_urls.pngs`. Gera:
- **CSV** com 93 colunas exactas (header oficial Metricool, May 2026)
- **ZIP** com PNGs organizados por carrossel

**Regras Metricool:**
- 1 linha por (carrossel × plataforma) — não 1 linha multi-flag
- `Time` em HH:MM:SS, `Date` YYYY-MM-DD
- Cada plataforma activa = "TRUE", outras = "FALSE" (não vazias)
- CRLF estrito (RFC-4180)
- **TikTok:** semântica invertida — usa `disable_*`, não `allow_*`
- IG Carousel: PNGs em `Picture Url 1..10`

**Caption autor tag** (env `CAPTION_AUTHOR_TAG`):
- Default `@vivianne.dos.santos`
- Inserido **antes das hashtags**, depois da copy
- Detecta duplicação case-insensitive
- Quando publicado: post aparece em `instagram.com/vivianne.dos.santos/tagged/`

### Fase 5 · Arquivo e biblioteca

**Páginas:**
- `/admin/biblioteca` — galeria de imagens únicas (dedupe por URL).
  Activas com borda dourada, arquivadas em secção separada.
- `/admin/carrosseis` — lista activa (esconde archived via filtro JS).

**Endpoints:**
- `POST /api/admin/items/bulk-archive` — reagenda para 2099-12-31 +
  marca `metadata.archived=true`. Reversível (mudar scheduled_at).
- `POST /api/admin/items/bulk-delete` — apaga definitivamente.
  Reservado para limpezas absolutas.
- `POST /api/admin/items/find-duplicates` — detecta items com mesmo
  `(scheduled_at, categoria)`. Mantém menor código, arquiva resto.

**Princípio:** trabalho gerado **NUNCA** é destruído sem confirmação
dupla (dry-run → confirm). Imagens Replicate são caras.

---

## 3. Decisões editoriais que NÃO se mudam sem discussão

Estas regras estão no system prompt da Claude (em `content-generator.ts`).
Outra Claude session que mexa nisto sem perceber **vai partir a marca**.

1. **PT-PT, nunca PT-BR.** "telemóvel" não "celular".
2. **Sem travessões longos** (`—`). Vírgulas ou pontos.
3. **Sem jargão new-age.** Nada de "energia feminina", "sagrado feminino",
   "luz interior", etc.
4. **Sem emojis no corpo dos slides.**
5. **Tom autoritário mas calmo** — viu tudo, não julga.
6. **Sem close-up de caras** nas imagens. Pessoas em interacção, cenas,
   ambientes com luz dourada lateral. NUNCA olhar directo à câmara.
7. **Sem alucinações temporais no CTA** — proibido "segunda que vem",
   "até breve", "próxima". CTA é intemporal.
8. **Cobertura de imagens 4/8 mínimo:** capa + cta + 2 conteúdos.

---

## 4. Estado de máquinas

### `content_items.status`

```
        ┌──────► draft ───────► ready ───────► rendering ───────► rendered ──► published
        │         │               │                │                  │
   plan-week      │           submitRender    bulk-render        sync-status
   process-slot   │
                  │
                  └─► (qualquer fase) ──► failed
                  └─► (qualquer fase) ──► (archived = scheduled 2099)
```

Mudanças automáticas:
- `plan-week`/`process-slot`: cria com `draft`
- `dispatchCarouselRender`: marca `rendering`
- `render-status` ou `sync-all`: actualiza `rendered`/`failed` quando
  vê result.json final
- `metricool` export: pode marcar `published` (não implementado ainda)

Mudanças manuais:
- Editor: drag&drop ou auto-imagens → fica `draft`
- Bulk archive: scheduled_at → 2099-12-31, metadata.archived=true

### `render_jobs.status`

```
queued → running → done | failed
```

Verdade vive em `render-jobs/{jobId}-result.json` (escrito pelo runner).
DB é só espelho para queries rápidas.

### `campaign_jobs.status`

```
queued → running → done | failed | cancelled
```

Cada vez que `process-slot` é chamado, actualiza `current_slot`,
`progress`, `items_created` (append). No último slot marca `done`.

---

## 5. Pontos de falha conhecidos + recuperação

| Sintoma | Causa | Acção de recuperação |
|---|---|---|
| `Load failed` Safari ao planear | Fetch timeout > 60s | Botão "Retomar a partir do slot N" |
| Replicate HTTP 402 | Sem crédito | Recarregar em replicate.com/account/billing, depois "Retomar só imagens" |
| GH dispatch 403 | PAT sem scope `workflow` | Fix PAT, redeploy Vercel |
| Workflow falha em apt install | `ubuntu-latest` mudou para Noble | Pin `ubuntu-22.04` |
| Workflow falha em `setup-node@v4` | `cache: npm` + lockfile no `.gitignore` | Remover `cache` |
| UI diz `rendering` mas GH Actions verde | Result.json escrito mas ninguém fez polling | Painel → "Sincronizar status" |
| Calendário mostra dia errado | Comparação UTC vs CAT | `CAMPAIGN_TZ_OFFSET` correcto, código já lida |
| 1 dia com 3+ publicações | Duplicates de re-planeamento | Painel → "Detectar duplicates" |
| Imagem repetida 5× no pool | Não havia dedupe | Já fixed em `image-pool.ts` |
| Markdown `**bold**` aparece com asteriscos visíveis | Regex `.+?` não atravessa `\n` | Já fixed: `[\s\S]+?` |
| Render aparece sem estilo, texto no topo, metade inferior preta | Layout da route que o Puppeteer carrega não importa `globals.css` | Adicionar `import '../[locale]/globals.css'` (ou path equivalente) no `layout.tsx` da route de render |
| Build Vercel falha por warning | Push intermédio sem `npm run build` local | Reverter, sempre build local primeiro |
| Deploy stuck em SHA antigo | Webhook GitHub→Vercel partiu | Redeploy manual no Vercel UI |

---

## 6. Interface — princípios de layout

Estes não são preferências estéticas. São padrões que se repetem em
TODAS as páginas do admin e a outra sessão tem que respeitar:

### Sidebar fixo 240px

```
✦ SyncHim · Estúdio
├ Painel              (default landing, ponto de situação)
├ Carrosseis          (lista activa, render bulk, arquivar testes)
├ Vídeos              (idem para vídeos)
├ Calendário          (4-12 semanas, navegável, TZ-aware)
├ Planear             (núcleo do pipeline, 4 secções)
├ Biblioteca          (galeria de assets reusáveis)
├ Campaign jobs       (background runs)
├ Prompts MJ          (modo manual de imagens)
├ Metricool           (export CSV+ZIP)
├ Render jobs         (overview)
└ Testes de fluxo     (atalhos do funil)
```

### Densidade de informação

- Font base 13-14px, sans-serif Inter
- H1: serif 28px weight 500
- H2: serif 20px weight 500
- Padding cards: 20px
- Padding btn: 8px 14px
- Tabelas: 8-10px padding, font 13

### Componentes-base reutilizados (em CSS, não recriar em JS)

`.card`, `.btn`/`.btn.primary`/`.btn.danger`, `.pill.{status}`,
`table.t`, `.row`, `.mini`, `.muted`, `.input`.

### Patterns visuais obrigatórios

1. **Card "Próxima acção"** no topo do painel, borda dourada, com
   sugestão actionable.
2. **Card "Diagnóstico"** no topo do `/planear`, antes do form.
3. **Card "Estimativa"** sempre antes de botões caros, mostra
   `N items · M assets · $X · Y min`.
4. **Card de cleanup/arquivar** no topo de páginas onde há acumulação
   de testes.
5. **Barra de progresso com 2 fases** (texto / imagens) em loops longos.
6. **Botão "Retomar do slot X"** sempre que há erro em loop.
7. **Cor por status** em cada item:
   - `draft` cinzento (var(--linha))
   - `ready` dourado (var(--ouro))
   - `rendering` ouro-folha (var(--ouro-folha))
   - `rendered` verde (#6EBB7B)
   - `published` verde escuro
   - `failed` bordeaux

### Marca

- Ícone: **EstrelaPersa SVG** (componente em `src/components/marks/`)
  — **NUNCA** unicode `✦` em produção.
- Cor primária: ouro #B8843D / ouro-folha #D4A857
- Cor de destaque: rosa #E08496
- Cor de fundo: #1A1410 dark + gradient bordeaux #5A1A2A no topo

---

## 7. Ordem para construir noutro projecto (resumo)

1. Supabase: bucket público + schema `synchim` (ou outro nome) com
   tabelas `content_items`, `content_slides`, `render_jobs`,
   `campaign_jobs`, `admins`.
2. Next.js 14 App Router + admin auth (allowlist + cookie HMAC).
3. CSS tokens em `admin.css` (mesma estrutura, paleta da marca nova).
4. Layout shell `admin/layout.tsx` com sidebar.
5. Página `/admin/planear` com 4 secções (diagnóstico, configurar,
   estimativa, acção).
6. Endpoints `test-*` por provider que faças usar.
7. Integração Claude (`content-generator.ts`) com tool-use + post-
   validação + retry.
8. Integração Replicate (`replicate.ts`) com upload defensivo para
   Storage (URLs Replicate expiram).
9. Pool de reuso (`image-pool.ts`) com dedupe por URL.
10. GitHub Actions render workflow (`ubuntu-22.04`, sem cache npm).
11. Template HTML render com paleta da marca nova.
12. Biblioteca, Arquivo, Calendário, Painel.
13. Background workflow para campanhas grandes.
14. Metricool CSV (header 93 cols, regras TikTok inversas).

Cada passo respeita os 7 princípios da secção 16 do
`PIPELINE-UX-PRODUCAO.md`.

---

## 8. Para a outra Claude session — checklist de leitura

Antes de propor qualquer mudança:

- [ ] Leste a secção 1 deste doc (mapa do circuito)
- [ ] Leste a secção 3 (decisões editoriais que não se mudam)
- [ ] Leste a secção 5 (pontos de falha conhecidos)
- [ ] Leste a secção 6 (padrões visuais obrigatórios)
- [ ] Leste a secção 16 + 17 do `PIPELINE-UX-PRODUCAO.md`
  (princípios + kit visual)

Se queres mudar algo:
1. Justifica em comentário no PR descrição
2. Não reescrevas componentes em vez de adaptar
3. Não inventes paletas — usa as CSS vars
4. Não criar UI nova quando há pattern existente que serve
5. Build local + `npm run build` zero warnings antes de qualquer push

Se discordas de uma decisão editorial: pede à Vivianne validação antes
de mudar. As regras 1-8 da secção 3 vieram de feedback dela hoje
(2026-05-28) e custaram tempo de iteração.

---

## 9. Aprendizagens consolidadas (para evitar pagar 2× pelo mesmo erro)

### Sobre processo

1. **Build local ANTES de cada push.** Vercel Hobby tem ~100 deploys/dia
   mas conta cost de compute. Cada falha de build = quota gasta sem
   resultado. Hoje queimámos 3-4 deploys por push intermédio com
   warnings (escape de aspas, `<img>` ESLint, etc).
2. **Push directo a main em vez de PR + merge** poupa 50% das builds
   (preview + production → só production). Excepto quando muda algo
   estrutural — aí PR para revisão.
3. **Empty commits para forçar redeploy** raramente são necessários
   quando o webhook está OK. Não fazer sem pedir.
4. **Doc-only changes** ainda triggam build. Agrupar em batches.

### Sobre integração de providers

5. **Anthropic SDK > REST cliente custom.** O SDK lida com retries,
   timeouts, streaming. Migração no commit `47ae423` simplificou
   `claude.ts` em ~60 linhas.
6. **Replicate URLs expiram em ~1h.** Sempre fazer download + upload
   para Supabase Storage logo após gerar. Em `replicate.ts`.
7. **GitHub Actions PAT** precisa de scope `workflow` (classic) ou
   `Actions: Read/Write` (fine-grained). Token sem isto = 403.
8. **`ubuntu-latest` é instável**. Em 2026 mudou para 24.04 (Noble)
   que renomeou pacotes para `-t64` e partiu o apt install. Pinar
   sempre a versão LTS testada (`ubuntu-22.04`).
9. **`setup-node@v4` cache** falha hard se `cache-dependency-path`
   apontar para ficheiro no `.gitignore`. Remover `cache: npm` se
   não há lockfile versionado.

### Sobre arquitectura de dados

10. **Códigos sequenciais (`SC-XXX`) nunca reset.** Mesmo depois de
    arquivar. Mantém auditoria histórica e evita colisões.
11. **`metadata` jsonb** é o sítio para flags estado (archived,
    campaignWeek, knot, etc) em vez de colunas SQL — mais flexível
    para iterar.
12. **Arquivar > Apagar.** `scheduled_at = 2099-12-31` esconde de
    todos os filtros activos mas preserva slides/imagens (o trabalho
    caro). Reversível.
13. **Dedupe por URL no pool de reuso** é crítico. Sem isto, imagens
    populares dominam por terem mais "votos" no random pick.

### Sobre UX

14. **Diagnóstico antes de produção.** Botão "Testar Claude/Replicate"
    custa ~$0.001 e poupa horas a debugar bulk de 70 items.
15. **Estimativa antes de executar.** Card sempre visível: items,
    assets, $, tempo. Evita surpresa de custo.
16. **Retomar > Recomeçar.** `runFrom(slot)` + idempotência em
    `generate-images`. Loop client-side guarda `errorSlot`.
17. **Background processing** quando o loop é longo (>10 min). Workflow
    GitHub Actions com `for` em bash + curl ao endpoint. Browser pode
    fechar.
18. **TZ explícito em todo lado** (`+02:00` Maputo). UTC vs local é
    confusão garantida — eu falhei nisto e a Vivianne reportou
    "1 dia com 3 publicações".

### Sobre o template visual

19. **Italic com peso máximo 500** no Google Fonts default. Para
    italic pesado, importar weights 600-800 explicitamente.
20. **Regex JS com `.+?`** não atravessa newlines. Para markdown
    multilinha usar `[\s\S]+?`.
21. **Image área 62% > 50%** para split mode. O texto numa banda
    estreita destaca, a imagem cinematográfica respira.
22. **Gradiente em camada separada do `image-area`** porque
    `overflow:hidden` corta o fade. Fora, com `top: 45%` que cobre
    transição imagem→texto suave.
23. **Body gradient termina aos 90%, não 60%.** Senão a metade
    inferior do slide é preto seco e quebra a estética warm.

### Sobre Vercel quota

24. **Pro $20/mês** dá $0.65 consumidos em 12h de iteração intensa,
    mas média 3-meses dela é $96 — extras vão à on-demand.
25. **Configurar `Ignored Build Step`** com bash para skip builds em
    PRs `.md`-only é boa otimização (não implementado).

---

## 10. Estado do repo no fim do dia 2026-05-28

**Branches relevantes:**
- `main` — produção, commit `e49446e`+ (este doc)
- `claude/30mdias-campaign-content-wQnr3` — fechada/merged

**Commits do dia:** ~30 entre PRs (1-51) e pushes directos.

**Ficheiros novos hoje:**
```
src/lib/admin/replicate.ts                    (geração imagens)
src/lib/admin/image-pool.ts                   (reuso com dedupe)
src/lib/admin/render-dispatch.ts              (helper bulk render)
src/lib/admin/worker-auth.ts                  (X-Worker-Token)

src/app/api/admin/test-claude/                (diagnóstico)
src/app/api/admin/test-replicate/             (diagnóstico)
src/app/api/admin/generate-images/            (Replicate + reuse)
src/app/api/admin/items/bulk-archive/         (arquivar)
src/app/api/admin/items/bulk-delete/          (apagar)
src/app/api/admin/items/find-duplicates/      (detectar dupes)
src/app/api/admin/items/shift-time/           (corrigir TZ)
src/app/api/admin/carrosseis/bulk-render/     (render N items)
src/app/api/admin/render-status/sync-all/     (sync GH → DB)
src/app/api/admin/campaigns/start/            (background trigger)
src/app/api/admin/campaigns/process-slot/     (worker callback)
src/app/api/admin/campaigns/[id]/             (status read)

src/app/admin/biblioteca/                     (galeria reuse)
src/app/admin/campaign-jobs/                  (background monitor)
src/app/admin/carrosseis/BulkRenderButton.tsx
src/app/admin/carrosseis/CleanupTestsButton.tsx
src/app/admin/CoverageActions.tsx
src/app/admin/planear/PlanearForm.tsx         (full pipeline UI)

.github/workflows/plan-campaign.yml           (campaign worker)

supabase/campaign-jobs.sql                    (state machine)

PIPELINE-UX-PRODUCAO.md                       (princípios + kit visual)
PIPELINE-CIRCUITO-COMPLETO.md                 (este doc, end-to-end)
```

**Ficheiros profundamente alterados:**
```
src/app/admin/page.tsx                         (painel reescrito)
src/app/admin/calendario/page.tsx              (TZ + navegação)
src/app/admin/carrosseis/page.tsx              (filtro arquivados)
src/app/admin/carrosseis/[id]/CarrosselEditor.tsx (setas, complete imagens, re-render)
src/app/admin/SlidePreview.tsx                 (espelha template novo)
src/app/api/admin/plan-week/route.ts           (weeksCount, TZ, validation)
src/app/api/admin/auth/debug/route.ts          (todas as envs)
src/lib/admin/content-generator.ts             (regras editoriais)
src/lib/admin/calendar-plan.ts                 (09h/13h, multi-week)
tools/render-carrossel/template.html           (62/42, gradient, EstrelaPersa)
.github/workflows/render-carrossel.yml         (ubuntu-22.04)
```

**Ficheiros apagados:**
```
tools/render-carrossel/styles.css   (dead code, selectors não casavam)
```


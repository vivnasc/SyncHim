# Pipeline UX — Produção de Conteúdo

> Documento de referência da experiência de utilizador que se construiu no SyncHim
> para gerar carrosseis em bulk. Padrão portátil — copia para os teus outros
> projectos. Foca o **fluxo do utilizador** e os padrões de UX, não a
> arquitectura técnica (essa está em `EXPERIENCIA-PRODUCAO-CONTEUDO.md`).

---

## 1. Princípios de UX

Quatro regras que tornaram este pipeline diferente:

1. **Diagnóstico antes de produção.** Nunca queimar dinheiro/tempo a gerar em
   bulk sem antes confirmar que cada peça do pipeline está viva. Botões de
   teste são gratuitos (~$0.05) e poupam horas.
2. **Estimar antes de executar.** O utilizador vê em texto quanto vai gastar
   e quanto tempo vai demorar antes de carregar no botão.
3. **Retomar, nunca recomeçar.** Cada operação longa lembra-se de onde parou.
   Se falhar a meio, o utilizador continua de onde parou — não regera o que
   já foi feito.
4. **Arquivar, nunca apagar.** O trabalho gerado (especialmente imagens caras)
   nunca se perde por engano. Esconde-se mas mantém-se.

---

## 2. Mapa das páginas (admin)

```
/admin
├── /                  Painel · estado geral + atalhos
├── /carrosseis        Lista activa (esconde arquivados) + botão "arquivar testes"
├── /carrosseis/[id]   Editor individual (preview ao vivo + render PNG)
├── /videos            Lista de vídeos
├── /calendario        Grid 4 semanas, peças posicionadas por scheduled_at
├── /planear           ⭐ Núcleo do pipeline — ver detalhe abaixo
├── /biblioteca        Galeria de TODAS as imagens geradas, para reuso
├── /prompts           Prompts MJ pendentes (modo manual de imagem)
├── /metricool         Export CSV + ZIP para upload no Metricool
├── /render-jobs       Estado dos jobs Puppeteer/FFmpeg
└── /testes            Atalhos para validar o funil sem pagar
```

---

## 3. Página `/admin/planear` — fluxo detalhado

A página tem **4 secções** numa ordem que reflecte o fluxo de decisão.

### Secção 0 · Diagnóstico

Card com `Passo 0 · Diagnóstico` no topo. Três botões:

- **"Testar Claude API"** → `GET /api/admin/test-claude`. Faz 1 chamada mínima
  (~2s, ~$0.0001). Devolve JSON com `ok`, `model`, `latencyMs`, `keyPrefix`,
  `usage`. Se der erro: o JSON diz exactamente em que estágio (env, claude,
  fetch) e qual o status HTTP do provider.
- **"Testar Replicate"** → `GET /api/admin/test-replicate`. Gera 1 imagem
  ping (~5-15s, ~$0.04). Devolve `ok`, `model`, `url` (Supabase Storage),
  `latencyMs`. Clicar no URL abre a imagem — confirma rede + Storage + auth.
- **"Ver envs do Vercel"** → `GET /api/admin/auth/debug`. Não testa, lista o
  estado das envs (set/length/prefix sem expor valores). Inclui
  `VERCEL_GIT_COMMIT_SHA` para confirmares o deploy actual.

**Padrão:** cada teste devolve JSON estruturado, mostrado num `<pre>` com
syntax color (verde texto = ok, vermelho = falha). Erros incluem stage exacto:
`env`, `claude`, `replicate`, `fetch`. Nunca um simples "failed".

### Secção 1 · Configurar campanha

- **Date picker** — "Segunda-feira inicial". Hint debaixo explica os horários
  (09:00 manhã, 13:00 tarde) e sugere a segunda seguinte se não houver tempo.
- **Duração** — select com 1 / 2 / 4 / 5 semanas (5 = campanha 30 dias).
- **Modo teste** — checkbox + input numérico (default 3). Quando ligado,
  gera só os primeiros N slots para validar qualidade.
- **Estratégia de imagens** — select de 3 opções:
  - `Sempre gerar nova` (default fase 1): chama Replicate sempre. Custo cheio.
  - `Reusar quando há match`: tenta biblioteca primeiro, gera se falhar.
  - `Só reusar`: nunca chama Replicate. Slides sem match ficam texto-puro.
- **Modelo Replicate** — Flux 1.1 Pro vs Schnell. Só visível quando estratégia
  != "só reusar".
- **Auto-imagens** — checkbox para correr geração de imagens automaticamente
  após texto.

### Secção 2 · Estimativa

Card escuro que se actualiza ao vivo conforme as escolhas:

```
N carrosseis · ~M imagens · ~$X.XX de Replicate · ~Y min
```

A estimativa é honesta: usa tempo médio por carrossel (10s só-texto, 30-60s
com imagens conforme modelo) e custo médio (Pro $0.04, Schnell $0.003).
Mostra `$0.00 (só reuso)` quando aplicável.

### Secção 3 · Acção e progresso

Botão primário **"Planear N semanas"** ou **"Teste · N carrosseis"** consoante
o modo. Quando corre:

- **Fase 1 (texto):** barra dourada, contador `Texto X / Y`.
- **Fase 2 (imagens):** barra muda para `ouro-folha`, contador
  `Imagens X / Y`. Stats por baixo: `Reusadas: X · Geradas: Y`.
- **Erro a meio:** mensagem `Slot X/Y · HTTP Z · <causa>` + botão
  **"Retomar a partir do slot X"** OU **"Retomar só imagens (N carrosseis)"**.
- **Sucesso:** lista dos carrosseis criados (código, título, hora agendada).
  Atalhos: `Ver calendário`, `Ver carrosseis`.

**Padrão crítico de retoma:**
- `runFrom(startSlot)` aceita índice — não é "tudo ou nada".
- `resumeImagesOnly()` corre apenas a fase 2 sobre os items já criados.
- `generate-images` é idempotente: pula slides que já tenham `imageUrl`.

---

## 4. Padrão de diagnóstico — endpoint de teste

Cada integração externa tem um endpoint de teste dedicado:

```
GET /api/admin/test-{provider}
  - Auth: admin cookie
  - Faz chamada mínima ao provider (1 token, 1 imagem, etc.)
  - Devolve JSON com { ok, stage, latencyMs, keyPrefix, ...details }
  - Em erro: { ok: false, stage, error, type, details } + HTTP do provider
```

**Replicar:** para qualquer API que adicionares, cria
`/api/admin/test-{nome}` com a mesma assinatura. UI ganha automaticamente
mais um botão sem precisar de mudanças estruturais.

---

## 5. Padrão de estimativa de custo

Antes de qualquer botão "executar bulk", a UI mostra:

```typescript
const estCost = strategy === 'reuse-only'
  ? '0.00 (só reuso)'
  : (estItems * pricePerUnit).toFixed(2);
```

Aplicado a Claude (texto), Replicate (imagens), ElevenLabs (voz), Suno (música).
Custo aparece **no card de estimativa**, não num tooltip — fica visível
enquanto o utilizador decide.

---

## 6. Padrão de reuso · biblioteca · arquivar

Três páginas/endpoints que tornam o trabalho gerado "imortal":

### `/admin/biblioteca`

Lista TODAS as imagens com `imageUrl` em `content_slides`. Não importa se
o item está activo, arquivado, ou em draft. Grid 4:5 responsivo. Cada item
tem botão `copiar URL` e link para o carrossel-fonte.

```typescript
// query simples — lê content_slides directo
.select('id, idx, design, item_id, content_items!inner(code, title, ...)')
.order('idx', { ascending: true })
.limit(2000)
```

### `POST /api/admin/items/bulk-archive`

Em vez de apagar, **reagenda para `2099-12-31`** e marca
`metadata.archived = true`. Saem do calendário activo (que filtra
`scheduled_at < 2099`) mas mantêm-se completos.

Defaults seguros:
- Recusa sem pelo menos 1 filtro (status, codeFrom, codeTo, scheduledBefore)
- `dryRun: true` por defeito — só apaga com `confirm: true`
- Aceita filtros estilo SQL para precisão

### `POST /api/admin/items/bulk-delete`

Mesmo esquema, mas apaga mesmo. Reservado para limpezas definitivas.

### Reuso automático na geração nova

`findReusableImage(layout, categoria, exclude)` em `src/lib/admin/image-pool.ts`:
- Match por `layout` (capa/conteudo/cta/assinatura) + `categoria` agrupada
  (didáticos A/B/C/D partilham pool)
- `exclude` set evita repetir URL dentro do mesmo lote
- Fallback: se pool exausto pelo exclude, permite reuso interno

`POST /api/admin/generate-images` aceita `reuseStrategy`:
- `prefer-existing`: tenta pool, gera se não houver match
- `always-new`: ignora pool, gera sempre
- `reuse-only`: usa pool ou deixa o slide sem imagem

---

## 7. Padrão de retoma

Operações longas (gerar 70 carrosseis = ~80 min) **NUNCA** são tudo ou nada:

```typescript
const SLOT_TIMEOUT_MS = 90_000;

async function runFrom(startSlot: number) {
  for (let i = startSlot; i < totalSlots; i++) {
    setCurrent(i + 1);
    try {
      const res = await fetchWithTimeout('/api/admin/plan-week', {
        method: 'POST',
        body: JSON.stringify({ startDate, slotIndex: i, weeksCount }),
      }, SLOT_TIMEOUT_MS);
      // ...
    } catch (err) {
      setError(`Slot ${i + 1}/${totalSlots} · ${msg}`);
      setErrorSlot(i);  // ← guarda onde parou
      return;
    }
  }
}
```

UI mostra **"Retomar a partir do slot X"** quando `errorSlot != null`.
Cada slot é uma chamada HTTP separada — não há transacção entre slots.
`AbortController` força timeout client-side antes do servidor tomar muito tempo.

---

## 8. Padrão de validação no servidor

Quando a Claude (ou outro LLM) pode entregar algo que viola regras editoriais,
faz **post-validação** com retry:

```typescript
// content-generator.ts
export async function generateCarousel(...): Promise<GeneratedCarousel> {
  const result = await generateStructured(...);
  validateImageCoverage(result, type);  // ← throw se violar
  return result;
}

function validateImageCoverage(c, type) {
  const problems: string[] = [];
  if (!c.slides[0]?.imagePrompt?.trim()) problems.push('capa sem imagePrompt');
  // ...
  if (problems.length > 0) {
    const err = new Error(`Cobertura insuficiente: ${problems.join('; ')}`);
    (err as any).code = 'IMAGE_COVERAGE';
    throw err;
  }
}

// route.ts
try {
  carousel = await generateCarousel(...);
} catch (err) {
  if (err.code === 'IMAGE_COVERAGE') {
    carousel = await generateCarousel(...);  // retry 1x
  } else throw;
}
```

Custo: ~$0.10 extra quando retry dispara. Recompensa: nunca um carrossel
publicado com 1/8 imagens só no CTA.

---

## 9. Monitorização e debug

Quatro pontos de verificação rápidos:

| Verifica | Onde | O que esperar |
|---|---|---|
| Deploy actual | `GET /api/admin/auth/debug` | `VERCEL_GIT_COMMIT_SHA` actualizado |
| Envs configuradas | mesmo endpoint | `set: true` em todas |
| Provider vivo | `/api/admin/test-*` | `ok: true` + latência baixa |
| Trabalho preservado | `/admin/biblioteca` | Imagens dos testes visíveis |

---

## 10. Estratégia de teste em produção

Sempre nesta ordem, NUNCA saltar:

1. **Testar provider isolado** (1 chamada, ~5s). Confirma rede + auth.
2. **Modo teste com N pequeno** (3-5 carrosseis, ~5 min, ~$1). Confirma
   integração end-to-end + regras editoriais.
3. **Revisão visual** dos N. Critério explícito (ex: "capa com imagem? texto
   centrado? número fantasma visível? imagem é cena, não close-up?").
4. **Só então scale.** Modo teste OFF, semanas ao máximo, deixar correr.

Custo de saltar passos:
- Saltar 1: $0 mas pode dar "Load failed" sem feedback útil.
- Saltar 2: queimas $20 antes de saber que a regra está mal.
- Saltar 3: publicas 70 carrosseis com problema sistémico.

---

## 11. Como replicar noutro app

Copia estes ficheiros adaptando para o domínio:

```
src/lib/admin/auth.ts                 padrão de allowlist + cookie HMAC
src/lib/admin/storage.ts              uploadJson / publicUrl Supabase
src/lib/admin/replicate.ts            Replicate sem SDK, com fallback upload
src/lib/admin/image-pool.ts           reuso por layout + categoria
src/lib/admin/claude.ts               SDK oficial com tool_choice forçado
src/lib/admin/content-generator.ts    schema tool + post-validação

src/app/admin/layout.tsx              shell com sidebar + nav
src/app/admin/admin.css               paleta + tokens densidade-info
src/app/admin/planear/PlanearForm.tsx pipeline UX completo

src/app/api/admin/test-claude/        endpoint diagnóstico Claude
src/app/api/admin/test-replicate/     endpoint diagnóstico Replicate
src/app/api/admin/auth/debug/         lista envs + SHA
src/app/api/admin/plan-week/          loop slot por slot
src/app/api/admin/generate-images/    reuse + generate com strategy
src/app/api/admin/items/bulk-archive/ arquivar em vez de apagar
src/app/api/admin/items/bulk-delete/  apagar com dry-run

src/app/admin/biblioteca/             galeria imagens reusáveis
src/app/admin/carrosseis/             lista activa + botão arquivar
```

**Adapta:**

1. `categoriaPool()` em `image-pool.ts` — define os grupos que partilham
   pool no teu domínio (no SyncHim os didácticos A/B/C/D agrupam, no teu
   pode ser outra coisa).
2. `WEEK_PLAN` em `calendar-plan.ts` — horários e tipos de slot da tua
   cadência editorial.
3. `SYSTEM_PROMPT` + `TYPE_BRIEFS` em `content-generator.ts` — voz da
   marca + briefs por tipo de conteúdo.
4. `MODEL_OPTIONS` em `PlanearForm.tsx` — modelos Replicate que queres
   suportar.

**O que NÃO copies sem pensar:**

- Cores da paleta (`admin.css` `:root`) — cada marca tem a sua.
- `EstrelaPersa` SVG — é da SyncHim.
- Texto português PT-PT — adapta para a língua editorial do projecto.

---

## 12. Checklist antes do primeiro bulk em produção

- [ ] `/api/admin/auth/debug` confirma `VERCEL_GIT_COMMIT_SHA` actual
- [ ] Todas as envs do provider em uso (`ANTHROPIC_API_KEY`,
      `REPLICATE_API_TOKEN`, `SUPABASE_*`, etc.) com `set: true`
- [ ] Bucket Supabase Storage criado e **público**
- [ ] Replicate com saldo (pay-as-you-go ou pre-paid)
- [ ] Teste de provider passa em <30s
- [ ] Modo teste com 3 carrosseis passa sem erros editoriais
- [ ] Revisão visual feita com critério explícito
- [ ] Data de arranque escolhida (com folga de pelo menos 24h)
- [ ] Calendário limpo (carrosseis de teste arquivados)

Só aí: bulk grande. Tempo investido em checklist (~10 min) salva-te de
queimar $20 + 80 min em retries.

---

## 13. Quando algo corre mal

| Sintoma | Causa provável | Acção |
|---|---|---|
| "Load failed" no UI | Timeout Vercel (Hobby 60s) | Reduzir batch, retomar com botão |
| Slot devolve HTTP 503 | `ANTHROPIC_API_KEY` ausente | Verificar `/debug`, redeploy Vercel |
| Slot devolve HTTP 500 com `IMAGE_COVERAGE` | Claude ignorou regra 2x | Editar `SYSTEM_PROMPT` para reforçar |
| Replicate HTTP 402 | Sem crédito | Recarregar em replicate.com/account/billing, retomar imagens |
| Build Vercel falha | Push intermédio sem build local | Reverter commit, build local primeiro |
| Deploy stuck em SHA antigo | Vercel webhook pausado | Vercel UI → "Redeploy" no último main |

Em todos os casos: o trabalho gerado até ao erro **NÃO se perde**. Está em
`/admin/biblioteca` (imagens) e `/admin/carrosseis` (texto). Continuas com
"Retomar".

---

## 14. Bulk render — pattern para evitar 14 cliques

A geração de texto + imagens cria items em `status='draft'`. Para
publicar precisas dos **PNGs finais compostos** (1080×1350 com texto +
imagem + marca + número fantasma + paginação). Isto é o **render**:
Puppeteer abre o `template.html`, injecta `window.SLIDE_DATA`, faz
screenshot.

Cada render é **1 carrossel completo** (8 slides → 8 PNGs num ZIP),
**não 1 slide**. Dispatch via GitHub Actions `workflow_dispatch`.

### Extrair helper partilhado

```typescript
// src/lib/admin/render-dispatch.ts
export async function dispatchCarouselRender(itemId: string) {
  // 1. Carregar item + slides do Supabase
  // 2. Construir manifest JSON
  // 3. Upload manifest para Supabase Storage
  // 4. Inserir render_jobs row (status='queued')
  // 5. Marcar content_items.status='rendering'
  // 6. Disparar GH Actions workflow
  return { itemId, code, jobId, manifestUrl };
}
```

### Endpoint bulk

```typescript
// POST /api/admin/carrosseis/bulk-render
// Body: { codeFrom?, codeTo?, status?, dryRun?, confirm? }
//
// Loop sequencial (cada dispatch ~200-500ms; 14 items = ~7s).
// GH Actions corre os jobs em paralelo (max 20 simultâneos Hobby).
```

### UI: botão com dry-run + confirm

```typescript
// 1. Click "Render bulk" → POST com dryRun: true → contagem
// 2. Mostra "Render N carrosseis →"
// 3. Click → confirm modal → POST com confirm: true
// 4. Redirect para /admin/render-jobs
```

### Workflow GitHub Actions — gotchas

```yaml
jobs:
  render:
    # NUNCA ubuntu-latest. Em 24.04 (Noble) muitos pacotes ganharam
    # sufixo -t64 (libasound2 -> libasound2t64, libatk1.0-0 -> ...-t64).
    # O nosso apt install rebenta com 'no installation candidate'.
    runs-on: ubuntu-22.04

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          # NUNCA 'cache: npm' se package-lock.json está no .gitignore.
          # Setup-node falha com 'Some specified paths were not resolved'.
```

---

## 15. Lições aprendidas — bugs que custaram tempo hoje

Para outras Claude sessions evitarem cair nestes:

### Editorial / regras de copy

1. **Claude ignora regras de cobertura** se forem prosa.
   Solução: post-validação no servidor + retry com instrução cirúrgica.
   Code em `content-generator.ts:validateImageCoverage()`.

2. **Claude alucina contexto temporal**. Vê `scheduled_at = segunda` e
   gera CTA "Na segunda-feira que vem continuamos".
   Solução: brief explícito **proíbe** referências a cadência semanal.

3. **Estética "close-up de cara" é a default da Claude/Flux**. Para
   evitar, system prompt tem que dizer **EXPLICITAMENTE** "cenas,
   pessoas em interacção, NUNCA cara colada ao ecrã".

### Render / GitHub Actions

4. **`ubuntu-latest` é roleta russa.** Pin a `ubuntu-22.04`.

5. **`setup-node@v4` com `cache: npm` + lockfile no `.gitignore`** quebra
   o step inteiro. Remover o cache (perde-se ~30s, ganha-se sanidade).

6. **`workflow_dispatch` via PAT precisa de scope `workflow`** (classic)
   ou **Actions: Read and write** (fine-grained). Token sem este scope
   devolve 403 "Resource not accessible".

7. **Quando o runner morre antes do script começar, `result.json` fica
   em 'queued' para sempre**. UI mostra status preso. Solução: botão
   "Re-render" deve estar visível em qualquer status, não só `done|failed`.

### Frontend / preview

8. **Regex `\*\*(.+?)\*\*`** não atravessa newlines. Para markdown a 2
   linhas usa `\*\*([\\s\\S]+?)\*\*`.

9. **Supabase `.or('col.is.null,col.lt.date')`** com literais de data é
   frágil. Substitui por filtro JS-side depois do `await`.

10. **`setUTCHours(9)` armazena 09:00 UTC**. Se o display é em CAT
    (UTC+2), o user vê 11:00. Constrói ISO string com offset explícito:
    `${date}T09:00:00+02:00`.

### Vercel

11. **Push intermédios sem build local consomem quota.** Hobby tem 100
    deploys/dia. Cada force-push = novo build. Build local antes do push.

12. **Push directo a main em vez de PR + merge** poupa 50% das builds
    (preview + production → só production).

13. **Envs novos no Vercel NÃO propagam sem redeploy.** Mesmo com toggle
    "Apply to all environments" — precisa de Redeploy manual.

### Supabase

14. **Bucket Storage tem que ser PÚBLICO** para o runner Puppeteer
    descarregar manifest sem token. RLS continua a proteger inserts.

15. **`metadata` jsonb** é o sítio certo para flags como `archived`,
    `campaignWeek`, `knot` em vez de adicionar colunas SQL.

---

## 16. Como passar a outra Claude session

Cola este texto no início da sessão da outra Claude:

> Vamos seguir o padrão de UX para produção de conteúdo que está
> documentado em `PIPELINE-UX-PRODUCAO.md` (no repo SyncHim do user).
> Lê o documento completo antes de propor qualquer página. Princípios
> obrigatórios:
>
> 1. **Diagnóstico antes de produção.** Cada provider (Claude, Replicate,
>    ElevenLabs, Suno) tem um endpoint `/api/admin/test-{nome}` dedicado
>    que faz 1 chamada mínima e devolve JSON com `{ ok, stage, latencyMs,
>    keyPrefix }`. UI tem botão por cima do form de geração.
>
> 2. **Estimar antes de executar.** Card visível com `N items · ~M
>    assets · ~$X custo · ~Y minutos` que se actualiza ao vivo conforme
>    as opções.
>
> 3. **Retomar, nunca recomeçar.** Operações longas guardam `errorSlot`
>    e mostram botão "Retomar a partir do slot X". Cada slot/item é uma
>    chamada HTTP isolada — não há transacção entre items.
>
> 4. **Arquivar, nunca apagar por defeito.** `metadata.archived = true`
>    + reagenda para 2099-12-31 esconde dos calendarios sem perder
>    trabalho. `bulk-delete` continua a existir para casos definitivos.
>
> 5. **Reuso automático de assets caros.** Antes de chamar Replicate/
>    ElevenLabs, procura na biblioteca um asset compatível (mesmo
>    layout + categoria). Se há match, usa. Senão, gera. Strategy
>    3-way: `prefer-existing` | `always-new` | `reuse-only`.
>
> 6. **Post-validação com retry.** Quando o LLM pode entregar algo
>    que viola regras editoriais, valida no servidor e dispara 1 retry
>    automático. Custo: 2× Claude no pior caso. Recompensa: nunca
>    publicar algo com 1/8 imagens só no CTA.
>
> 7. **Sempre testar single antes de bulk.** Botão "Modo teste · N
>    items" com default 3. Só desliga depois de aprovar visualmente.
>
> Stack assumida: Next.js 14 App Router + Supabase (auth + Storage +
> Postgres) + GitHub Actions (Puppeteer/FFmpeg render) + Vercel (host).
> Adapta para outra stack mantendo os princípios.
>
> Ficheiros para copiar verbatim e adaptar:
>
> - `src/lib/admin/auth.ts` (allowlist + cookie HMAC)
> - `src/lib/admin/storage.ts` (uploadJson + publicUrl)
> - `src/lib/admin/replicate.ts` ou outro provider
> - `src/lib/admin/image-pool.ts` (reuso por layout + categoria)
> - `src/lib/admin/content-generator.ts` (Claude tool-use + validação)
> - `src/lib/admin/render-dispatch.ts` (helper partilhado de render)
> - `src/app/admin/layout.tsx` (shell + sidebar nav)
> - `src/app/admin/admin.css` (paleta + densidade-info)
> - `src/app/admin/planear/PlanearForm.tsx` (pipeline UX completo)
> - `src/app/admin/biblioteca/page.tsx` (galeria de assets reusáveis)
> - `src/app/api/admin/test-*/route.ts` (diagnóstico por provider)
> - `src/app/api/admin/items/bulk-archive/route.ts` (arquivar)
> - `src/app/api/admin/{type}/bulk-render/route.ts` (render em massa)
> - `.github/workflows/render-*.yml` (Puppeteer/FFmpeg)
>
> Adapta editorialmente:
> - `categoriaPool()` em `image-pool.ts` para os grupos do teu domínio
> - `WEEK_PLAN` em `calendar-plan.ts` para a cadência editorial
> - `SYSTEM_PROMPT` + `TYPE_BRIEFS` para a voz da marca
>
> Antes de pushar qualquer commit:
> 1. `npm run build` local (zero warnings, zero erros)
> 2. Push directo a main (não PR — poupa quota Vercel)
> 3. Vercel auto-deploya. Confirma `VERCEL_GIT_COMMIT_SHA` em `/debug`.

---

## 17. Replicar a interface — kit visual completo

Esta secção tem o **código real para colar** noutro projecto. Princípios
estão em cima; aqui está o esqueleto visual.

### 17.1 Paleta + tipografia (CSS vars)

Adapta as cores para cada marca; mantém a estrutura.

```css
/* src/app/admin/admin.css */
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500&family=Inter:wght@300;400;500;600&display=swap');

:root {
  /* Paleta (adapta por marca) */
  --bg:          #1A1410;  /* fundo principal */
  --bg-elev:     #201914;  /* surfaces acima do bg */
  --bg-card:    #251D17;  /* cards */
  --texto:       #F2E8DC;  /* texto principal */
  --texto-suave: #A39B8E;  /* texto secundario */
  --ouro:        #B8843D;  /* acento primario */
  --ouro-folha:  #D4A857;  /* acento highlight */
  --bordeaux:    #8B2235;  /* danger / failed */
  --linha:       #3A2E22;  /* bordas / dividers */

  /* Tipografia (mantem) */
  --serif: 'EB Garamond', Georgia, serif;
  --sans:  'Inter', system-ui, sans-serif;
}
```

### 17.2 Layout shell — sidebar + main

```tsx
// src/app/admin/layout.tsx
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = getAdminEmailFromCookies();
  return (
    <div className="admin-body">
      {email ? (
        <div className="admin-shell">
          <aside className="admin-side">
            <div className="admin-brand">
              <span className="brand-mark">✦</span>  {/* SVG da marca aqui */}
              <span>SyncHim · Estúdio</span>
            </div>
            <nav className="admin-nav">
              <Link href="/admin">Painel</Link>
              <Link href="/admin/carrosseis">Carrosseis</Link>
              <Link href="/admin/calendario">Calendário</Link>
              <Link href="/admin/planear">Planear</Link>
              <Link href="/admin/biblioteca">Biblioteca</Link>
              <Link href="/admin/metricool">Metricool</Link>
              <Link href="/admin/render-jobs">Render jobs</Link>
            </nav>
            <div className="admin-foot">
              <span className="muted">{email}</span>
              <SignOutAdmin />
            </div>
          </aside>
          <main className="admin-main">{children}</main>
        </div>
      ) : (
        <main className="admin-main">{children}</main>
      )}
    </div>
  );
}
```

```css
/* admin.css continuação */
.admin-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.admin-side {
  background: #15100C;
  border-right: 1px solid var(--linha);
  padding: 24px 20px;
  display: flex; flex-direction: column; gap: 24px;
}
.admin-brand {
  font-family: var(--serif); font-size: 20px;
  display: flex; align-items: center; gap: 10px;
}
.brand-mark { color: var(--ouro-folha); font-size: 22px; }
.admin-nav { display: flex; flex-direction: column; gap: 2px; }
.admin-nav a {
  color: var(--texto-suave); text-decoration: none;
  padding: 8px 10px; border-radius: 4px; font-size: 13px;
}
.admin-nav a:hover { background: var(--bg-card); color: var(--texto); }
.admin-foot { margin-top: auto; display: flex; flex-direction: column; gap: 8px; font-size: 12px; }
.admin-main { padding: 32px 40px; max-width: 1400px; }
.admin-main h1 { font-family: var(--serif); font-weight: 500; font-size: 28px; margin: 0 0 4px; }
.admin-main h2 { font-family: var(--serif); font-weight: 500; font-size: 20px; margin: 24px 0 12px; }
.muted { color: var(--texto-suave); }
.mini { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--texto-suave); }
```

### 17.3 Componentes-base (4 que se usam em todas as páginas)

```css
/* Card — bloco de conteúdo */
.card {
  background: var(--bg-card);
  border: 1px solid var(--linha);
  border-radius: 6px;
  padding: 20px;
}

/* Button — 3 variantes: default, primary, danger */
.btn {
  font: inherit; font-size: 13px; padding: 8px 14px;
  background: transparent; border: 1px solid var(--linha);
  color: var(--texto); border-radius: 4px; cursor: pointer;
  text-decoration: none; display: inline-block;
  transition: border-color .15s, background .15s;
}
.btn:hover { border-color: var(--ouro); }
.btn.primary { background: var(--ouro); color: var(--bg); border-color: var(--ouro); }
.btn.primary:hover { background: var(--ouro-folha); }
.btn.danger { color: var(--bordeaux); border-color: var(--bordeaux); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Input — textareas, selects, dates */
.input, textarea, select {
  font: inherit; width: 100%;
  background: var(--bg); border: 1px solid var(--linha);
  color: var(--texto); padding: 8px 10px; border-radius: 4px;
}
.input:focus, textarea:focus, select:focus { outline: none; border-color: var(--ouro); }
label { display: block; margin-bottom: 4px; font-size: 12px; color: var(--texto-suave); }

/* Pill — status badges */
.pill {
  display: inline-block; padding: 2px 8px; border-radius: 999px;
  font-size: 11px; letter-spacing: 0.06em;
  text-transform: uppercase; border: 1px solid;
}
.pill.draft     { color: var(--texto-suave); border-color: var(--linha); }
.pill.ready     { color: var(--ouro);        border-color: var(--ouro); }
.pill.rendering { color: var(--ouro-folha);  border-color: var(--ouro-folha); }
.pill.rendered  { color: #6EBB7B;            border-color: #6EBB7B; }
.pill.published { color: #6EBB7B;            border-color: #6EBB7B; background: rgba(110, 187, 123, 0.1); }
.pill.failed    { color: var(--bordeaux);    border-color: var(--bordeaux); }

/* Table — densa, hover subtil */
table.t { width: 100%; border-collapse: collapse; font-size: 13px; }
table.t th, table.t td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--linha); }
table.t th { color: var(--texto-suave); font-weight: 500; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
table.t tr:hover td { background: rgba(184,132,61,0.04); }

/* Row helpers — flex inline */
.row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.row.between { justify-content: space-between; }
```

### 17.4 Patterns de página (com código real)

#### A) Diagnostic card (passo 0 de qualquer página de geração)

```tsx
<div className="card" style={{ marginBottom: 24 }}>
  <div className="mini" style={{ marginBottom: 8 }}>Passo 0 · Diagnóstico</div>
  <p style={{ fontSize: 13 }} className="muted">
    Antes de gerar dezenas de items, confirma que os providers estão vivos.
    Cada teste faz uma chamada minima (~2-5s).
  </p>
  <div className="row" style={{ gap: 8 }}>
    <button className="btn" onClick={() => test('claude')}>Testar Claude API</button>
    <button className="btn" onClick={() => test('replicate')}>Testar Replicate</button>
    <a className="btn" href="/api/admin/auth/debug" target="_blank">Ver envs Vercel</a>
  </div>
  {testResult && (
    <pre style={{
      marginTop: 12, padding: 12, background: 'var(--bg)',
      border: '1px solid var(--linha)', borderRadius: 4,
      fontSize: 12, whiteSpace: 'pre-wrap',
      color: testResult.ok ? 'var(--texto)' : 'var(--bordeaux)'
    }}>{JSON.stringify(testResult, null, 2)}</pre>
  )}
</div>
```

#### B) Estimate card (custo + tempo antes de executar)

```tsx
<div className="card" style={{ marginBottom: 16, padding: 12, background: 'var(--bg)' }}>
  <div className="mini" style={{ marginBottom: 4 }}>Estimativa</div>
  <div style={{ fontSize: 13, lineHeight: 1.7 }}>
    <strong>{totalSlots}</strong> items ·
    <strong> ~{estImages}</strong> assets ·
    <strong> ~${estCost}</strong> de Replicate ·
    ~{estMinutes} min
  </div>
</div>
```

#### C) Progress bar com fases (texto → imagens)

```tsx
{running && (
  <div style={{ marginTop: 20 }}>
    <div className="mini" style={{ marginBottom: 6 }}>
      Fase: {phase === 'copy' ? 'A gerar texto (Claude)' : 'A gerar imagens (Replicate)'}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: '100%', height: 8, background: 'var(--linha)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${progressPct()}%`, height: '100%',
          background: phase === 'images' ? 'var(--ouro-folha)' : 'var(--ouro)',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <span className="muted" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
        {current} / {total}
      </span>
    </div>
  </div>
)}
```

#### D) Resume button (depois de erro)

```tsx
{errorSlot !== null && !running && (
  <button type="button" className="btn" onClick={() => runFrom(errorSlot)}>
    Retomar a partir do slot {errorSlot + 1}
  </button>
)}
{needsResumeImages && !running && items.length > 0 && (
  <button type="button" className="btn" onClick={resumeImagesOnly}>
    Retomar só imagens ({items.length} items)
  </button>
)}
```

#### E) Cleanup card (limpar testes antigos)

```tsx
<div className="card" style={{ marginBottom: 24, borderColor: 'var(--ouro)' }}>
  <div className="mini" style={{ marginBottom: 8 }}>Limpar testes anteriores</div>
  <p style={{ fontSize: 13 }} className="muted">
    Antes de planear nova campanha, arquiva os testes (X+ em draft) para
    limpar o calendario. Assets ficam guardados em /admin/biblioteca.
  </p>
  <div className="row" style={{ gap: 8 }}>
    <button className="btn" onClick={check}>Ver quantos há para arquivar</button>
    {count > 0 && (
      <button className="btn primary" onClick={archive}>
        Arquivar {count} items
      </button>
    )}
  </div>
</div>
```

#### F) Biblioteca grid (galeria de assets reusáveis)

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 12,
}}>
  {assets.map((a) => (
    <div key={a.id} className="card" style={{ padding: 8 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.url} alt="" loading="lazy" style={{
        width: '100%', aspectRatio: '4 / 5', objectFit: 'cover',
        borderRadius: 4, background: '#0A0A0A',
      }} />
      <div className="mini" style={{ marginTop: 6, fontSize: 10 }}>
        {a.code} · {a.context}
      </div>
      <CopyUrlButton url={a.url} />
    </div>
  ))}
</div>
```

### 17.5 Ficheiros para copiar em bloco

Da raiz do SyncHim, copia para o teu projecto:

```
src/app/admin/admin.css                    (paleta + componentes base)
src/app/admin/layout.tsx                   (shell + sidebar)
src/app/admin/SignOutAdmin.tsx             (botão logout)
src/app/admin/planear/PlanearForm.tsx      (referência principal de UX)
src/app/admin/biblioteca/page.tsx          (galeria de assets)
src/app/admin/biblioteca/CopyUrlButton.tsx (botão copiar URL)
src/components/marks/EstrelaPersa.tsx      (substituir pela marca tua em SVG)
```

Adapta:
- **Cores** em `:root` — pinta a tua paleta
- **Marca SVG** em `EstrelaPersa.tsx` — substitui pelo símbolo da tua marca
- **Nav links** em `layout.tsx` — adiciona/remove páginas conforme o domínio
- **Texto PT-PT** — adapta para a língua editorial do projecto

Mantém intacto:
- Densidade de informação (font-size 13-14, padding 8-12)
- Hierarquia tipográfica (serif para H1/H2, sans para body)
- Lógica dos componentes (Card, Button, Pill, Table, Row)
- Patterns de UX (Diagnostic, Estimate, Progress, Resume, Cleanup, Biblioteca)

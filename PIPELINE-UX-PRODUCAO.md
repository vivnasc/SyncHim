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

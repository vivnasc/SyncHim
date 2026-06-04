# SyncHim — contexto para Claude

App Next.js da Vivianne. Diagnóstico emocional ("os 7 nós"), checkout PayPal/Stripe-BR, área de membros, estúdio interno (`/admin`) para criar carrosseis IG e reels MP4 para Metricool.

Stack: Next.js 14 (app router), TypeScript, Supabase (Postgres + Storage + Auth), Vercel (deploy), GitHub Actions (renders pesados), Tailwind, EB Garamond serif.

## Comunicação com a Vivianne

- **Português europeu**, frases curtas, sem rodeios. Ela escreve em iPad rápido e com erros — entende-se na mesma. Não corrijas a ortografia dela.
- Está com muita coisa em paralelo (campanhas, conteúdo, vida). **Não a faças perder tempo:** investiga sozinho antes de perguntar, dá passos numerados concretos, evita "ver no Vercel" quando podes ler do código.
- Quando der erro: lê os logs antes de adivinhar. Identifica causa raiz, nunca paches por cima.
- Quando algo precisa de config externa (Vercel env, GitHub secret), explica em 1 sítio só, com valor concreto pronto a copiar.

## Arquitectura admin (resumo)

- `/admin/carrosseis/{id}` — editor de carrossel (texto, design, render PNG Puppeteer)
- `/admin/videos/{id}` — editor de reel (cenas, voz ElevenLabs, música Suno/upload, render FFmpeg)
- `/admin/videos` — lista + bulk pipeline (dispara `process-reels.yml` no GitHub Actions)
- `/admin/renderizados` — galeria de carrosseis (PNG) e reels (MP4) prontos
- `/admin/metricool` — exporta CSV para Metricool (Planning → Calendar → Import)
- `/admin/diagnostics` — checklist de env vars
- `/admin/setup/database` — SQL migrations em copy-paste

## Pipeline reels (resumo)

1. Vercel `/api/admin/videos/bulk-pipeline/start` → cria row em `campaign_jobs`, dispara `process-reels.yml`
2. Workflow itera reels: backfill prompts → imagens (Replicate ou pool) → vozes (ElevenLabs with-timestamps) → tema musical → dispatcha `render-video.yml` por reel
3. Runner do render baixa manifesto, gera frames Puppeteer (1 PNG por palavra activa do karaokê), compõe MP4 FFmpeg com voz + música duckada, upload Storage
4. `/admin/renderizados` mostra MP4 inline · botão "Sincronizar renders pendentes" actualiza `content_items.status` para `rendered`

Karaokê SyncHim = palavra activa em ouro `#D4A857` com glow, palavras ditas em creme, futuras em creme 32%. Timestamps por palavra vêm de `design.wordTimes` (set pelo `/voice`).

## Convenções de código

- Edita ficheiros existentes em vez de criar novos sempre que possível
- Sem comentários redundantes — o nome diz o que é
- Server-side render por defeito (RSC), client components só onde precisa interactividade
- Erros visíveis (caixa vermelha com ícone), nunca silenciosos
- `IF NOT EXISTS` em todos os SQLs
- Settings dinâmicas via tabela `settings` (key/value JSONB), não via env vars
- Push directo em `main` (sem PRs nesta fase)

## Estado actual (03/06/2026)

**Feito hoje:**
- Karaokê reels (palavra a palavra sincronizada com voz)
- Voz `eleven_v3` + settings que preservam clone PT-PT (similarity 1.0, style 0)
- Música tema da campanha (upload MP3 directo, reutilizável em todos os reels)
- Reuso de imagens do pool da Biblioteca ($0 vs Replicate)
- Bulk pipeline server-side (browser pode fechar)
- 31 reels da campanha SV-* renderizados ✓
- Exporter Metricool auto-adaptável (detecta campanha/tipo/target dinamicamente)
- Editor de menção `@vivianne.dos.santos` para todas as captions
- Página `/admin/diagnostics` + `/admin/setup/database`

**Próximo:** testes da app (diagnóstico → resultado → checkout → membros).

## Avisos / quirks

- **Sotaque ElevenLabs flutua** mesmo com `eleven_v3` — é limitação do modelo. Não tentar mais magia, aceita-se
- **Metricool publicar no IG:** depende do tipo da conta (Business/Creator obrigatório). Não é problema do SyncHim
- **Vercel deploy de NEXT_PUBLIC_*:** inlined no build, precisa redeploy. Para evitar isso, código usa `req.headers.get('host')` para URL pública
- **Schema PostgREST cache:** após criar tabela nova, pode demorar 30s a aparecer
- **CAMPAIGN_WORKER_TOKEN:** mesmo valor em Vercel env + GitHub repo secrets

## Comandos úteis

```bash
npm run build          # antes de cada push
npm run dev            # local
```

Push para `main` deploy automático no Vercel.

# SYNCHIM — PACOTE COMPLETO DE ENTREGA

> Pacote pronto para Claude Code construir a aplicação completa.
> Última actualização: 16 de Maio de 2026

-----

## ESTRUTURA DO PACOTE

```
pacote/
├── 00-leia-primeiro/      ← Este ficheiro + ordem de execução
├── 01-briefing/           ← Briefing técnico mestre (o documento principal)
├── 02-persona/            ← Marina Vale: voz, identidade visual, vocabulário
├── 03-conteudo-pt/        ← Conteúdo PT: sessões 1-7 + práticas
├── 04-conteudo-en/        ← Conteúdo EN: sessões 1-7 + práticas
├── 05-landing/            ← Landing page PT + EN
├── 06-emails/             ← Emails transaccionais PT + EN
├── 07-anuncios/           ← Criativos Meta Ads + copy
├── 08-instagram/          ← Carrosséis de pré-lançamento
└── 09-legal/              ← Termos, privacidade, garantia
```

-----

## ORDEM DE EXECUÇÃO PARA CLAUDE CODE

**Semana 1 — Infraestrutura**

1. Ler `01-briefing/BRIEFING_MESTRE.md` integralmente
1. Setup Next.js 14 + Cloudflare Pages + Supabase + Stripe + Resend + next-intl + Tailwind
1. Criar schema da BD (SQL em `01-briefing/SCHEMA_BD.sql`)
1. Configurar i18n com rotas /en e /pt
1. Configurar produtos Stripe (BRL e USD, três tiers)

**Semana 2 — Páginas principais**
6. Landing page bilingue (`05-landing/`)
7. Checkout + webhook + magic link
8. Dashboard da utilizadora
9. Sessão 1 (reconhecimento) — texto em `03-conteudo-pt/sessao-01.md` e `04-conteudo-en/`
10. Sessão 2 (diagnóstico) — lógica de cálculo + apresentação de resultado

**Semana 3 — Sessões dinâmicas**
11. Estrutura de Sessões 3-7 com gating por nó dominante
12. Carregamento dinâmico do conteúdo por nó (7 nós × 3 sessões = 21 ficheiros .md)
13. Sistema de práticas entre sessões
14. Sistema de gating temporal (3 dias entre sessões)

**Semana 4 — Lançamento**
15. Emails transaccionais (`06-emails/`)
16. Página de conta + histórico de diagnósticos (Tier 0 reusável)
17. Sistema de upgrade dentro do produto
18. Testes end-to-end PT e EN
19. Deploy em Cloudflare Pages
20. Conectar domínio syncehim.com

-----

## DECISÕES FECHADAS — NÃO RENEGOCIAR

- **Nome do produto:** SyncHim (porta) / SyncMe (substância revelada na Sessão 5)
- **Autora-persona:** Marina Vale (sem rosto, sem voz pública)
- **Mercados:** Brasil + lusófonos + anglo, bilingue PT/EN com toggle
- **Hospedagem:** Cloudflare Pages (não Vercel)
- **Domínio:** syncehim.com
- **Estrutura comercial:**
  - Tier 0 — Grátis, reusável ilimitado (Sessões 1+2)
  - Tier 1 — R$ 127 / US$ 39 — Travessia do nó dominante (Sessões 3-7 do nó)
  - Tier 2 — R$ 297 / US$ 87 — Biblioteca completa dos 7 nós
- **Sessões:** 7 sessões em 21 dias, 1 a cada 3 dias
- **Nós:** Fome, Controlo, Inferioridade, Desconfiança, Salvadora, Abandono, Invisibilidade

-----

## CHECKLIST DE ENTREGA AO LANÇAMENTO

- [ ] Site live em syncehim.com
- [ ] Toggle PT/EN funcional
- [ ] Detecção automática de língua por geolocalização
- [ ] Stripe BRL e USD a funcionar
- [ ] Webhook a criar conta automaticamente
- [ ] Magic link a chegar em 1 minuto
- [ ] Sessão 1 e 2 acessíveis sem pagamento
- [ ] Tier 1 desbloqueia conteúdo específico do nó
- [ ] Tier 2 desbloqueia 7 nós completos
- [ ] Gating de 3 dias entre sessões funcional
- [ ] Email automático na abertura de cada sessão
- [ ] Histórico de diagnósticos visível ao utilizador
- [ ] Reembolso de 7 dias documentado em /garantia
- [ ] Termos e privacidade em /termos e /privacidade
- [ ] Cloudflare Turnstile na landing
- [ ] Conta Instagram @marinavale.sync criada com 10 carrosséis publicados

-----

## CONTEÚDO INCLUÍDO NESTE PACOTE

**Escrito integralmente:**

- Briefing técnico mestre
- Schema completo da BD
- Persona Marina Vale completa
- Sessão 1 (reconhecimento) — PT + EN
- Sessão 2 (diagnóstico, 21 situações + cálculo) — PT + EN
- Sessões 3, 4, 5 para o **Nó da Fome** (modelo completo)
- Sessões 6 e 7 (finais, comuns a todos os nós)
- 5 práticas para o Nó da Fome
- Landing page bilingue
- 8 emails transaccionais bilingues
- 10 conceitos de carrossel Instagram
- 6 conceitos de anúncios Meta
- Textos legais (termos, privacidade, garantia)

**Por escrever (próxima entrega após validação):**

- Sessões 3, 4, 5 para os outros 6 nós (Controlo, Inferioridade, Desconfiança, Salvadora, Abandono, Invisibilidade) — 18 textos
- Práticas para os outros 6 nós — 30 textos

A decisão de entregar **o Nó da Fome completo + estruturas modelo** em vez de tentar escrever os 7 nós de uma vez é deliberada: assim podes validar a voz e o método com o primeiro nó construído e funcional, antes de eu escrever os outros 18 textos. Se a voz precisar de afinação, ajusta-se no Nó da Fome e os restantes saem já no tom certo.

-----

FIM.

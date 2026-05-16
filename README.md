# SyncHim

Quiet 21-day process. Next.js 14 + Supabase + PayPal + Resend + next-intl, deployed on Cloudflare Pages.

Product brief lives in **`PRODUCT.md`** and **`BRIEFING MESTRE.pdf`**.

---

## Stack

- Next.js 14 (App Router)
- next-intl (PT / EN, routes `/pt` and `/en`)
- TailwindCSS
- Supabase (auth + Postgres + RLS)
- PayPal (Smart Buttons + Orders API v2, USD only)
- Resend (transactional email)
- Cloudflare Pages via `@cloudflare/next-on-pages`
- Cloudflare Turnstile (anti-bot)

## Local setup

```bash
cp .env.example .env.local
# fill in the values, see "Required env vars" below
npm install
npm run dev
```

The dev server runs on `http://localhost:3000` and redirects `/` to `/en` by default. Country detection uses the `CF-IPCountry` header, which is absent in local dev — the cookie / fallback (EN) takes over.

### Required env vars

| Var | Where to get it |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your site origin (e.g. `https://synchim.pages.dev`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `PAYPAL_MODE` | `sandbox` or `live` |
| `PAYPAL_CLIENT_ID` | From PayPal Developer dashboard |
| `PAYPAL_CLIENT_SECRET` | From PayPal Developer dashboard |
| `PAYPAL_WEBHOOK_ID` | Webhook ID from PayPal Developer (after creating webhook) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Same as `PAYPAL_CLIENT_ID`, exposed to the browser |
| `RESEND_API_KEY` | From resend.com |
| `RESEND_FROM` | `Marina <marina@your-verified-domain>` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (optional in dev) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret (optional in dev) |
| `PRICE_TIER1_USD` | `39.00` |
| `PRICE_TIER2_USD` | `87.00` (Tier 2 disabled at launch — kept for forward compat) |
| `PRICE_UPGRADE_NO_USD` | `19.00` |

## Database

```bash
# Supabase CLI
supabase db reset --linked
# or paste supabase/schema.sql into the Supabase SQL editor
```

The schema creates the auth-user → public.users trigger and the RLS policies. Service-role inserts bypass RLS, which is how the diagnostic and PayPal webhook write user data.

## PayPal setup

1. Create a **Business** app in https://developer.paypal.com/dashboard/applications.
2. Copy `Client ID` and `Secret` into `.env.local`.
3. In the same dashboard, register a **webhook** pointing to `https://<your-domain>/api/paypal/webhook` with the event `PAYMENT.CAPTURE.COMPLETED`. Copy the webhook ID into `PAYPAL_WEBHOOK_ID`.
4. Test the full sandbox flow before switching `PAYPAL_MODE=live`.

## Resend setup

1. Verify a sending domain in Resend.
2. Set `RESEND_FROM` to a verified address (e.g. `Marina <marina@your-domain>`).
3. The first email a user receives is a Supabase magic link rendered through Resend's API.

## Cloudflare Pages deploy

```bash
npm run build:cf       # produces .vercel/output/static
npx wrangler pages deploy .vercel/output/static
```

Set every env var from the table above in **Pages → Settings → Environment variables** (both Production and Preview). Mark anything starting with `NEXT_PUBLIC_` as public.

All API routes run on the **Node runtime** (`runtime = 'nodejs'`) because they call PayPal and Supabase admin from the server — Cloudflare Pages will translate this to the Edge-compatible runtime via `@cloudflare/next-on-pages`. The PayPal helper uses native `fetch` so it works edge-side.

## Phase 1 scope (what is live)

- Landing PT / EN
- Diagnostic (sessions 1 and 2, 21 questions, scoring + tiebreak)
- Result page with knot reveal + repeat-history comparison + upgrade CTA
- Tier 1 PayPal checkout for the **Hunger** knot only (US$ 39)
- Hunger sessions 3-5 + common sessions 6 + 7 with 3-day gating
- Dashboard, account, history, delete-my-data
- 8 transactional emails (Resend)
- Magic-link sign-in
- Legal pages (terms, privacy, guarantee) — USD/PayPal only

**Deferred to Phase 2:**

- Tier 2 (full library) — not sold until the other 6 knots are written.
- Hunger practices file is loaded by the session viewer but not surfaced as a separate page yet.
- Knot upgrade purchase (Tier 1 → another knot at US$ 19) — schema supports it via `nos_comprados_adicionais`; UI not exposed.

## File layout

```
.
├── content/
│   ├── pt/{sessao-01,02,06,07}.md
│   ├── pt/nos/fome/{sessao-03,04,05}.md
│   ├── pt/praticas/fome/index.md
│   ├── pt/legal/{termos,privacidade,garantia}.md
│   └── en/... (mirror, knots/hunger, practices/hunger)
├── messages/{pt,en}.json
├── middleware.ts
├── src/
│   ├── i18n.ts
│   ├── app/
│   │   ├── layout.tsx, page.tsx
│   │   └── [locale]/...
│   ├── api/
│   │   ├── diagnostico/calcular
│   │   ├── paypal/{create-order,capture-order,webhook}
│   │   ├── auth/{magic-link,signout}
│   │   ├── sessao/responder
│   │   ├── conta/apagar
│   │   └── notify
│   ├── components/...
│   └── lib/{supabase,paypal,resend,emails,turnstile,events,content,diagnostic,purchase}
├── supabase/schema.sql
└── PRODUCT.md (briefing-derived spec)
```

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

This app is designed to **live inside an existing Supabase project** without
colliding with other apps. Everything goes into a dedicated schema called
`synchim` (tables, functions, the trigger). To remove the app completely later:
`drop schema synchim cascade;`.

### Setup

1. **Apply the schema.** Open Supabase SQL editor and paste
   `supabase/schema.sql`. This creates `synchim.users`, `synchim.diagnosticos`,
   the trigger on `auth.users`, and the RLS policies.
2. **Expose the schema to PostgREST.** Go to
   *Project Settings → API → Exposed schemas* and add `synchim` to the list
   (typically `public, synchim`). Without this the supabase-js client gets
   `schema "synchim" not found` errors.
3. **Auth coexistence.** The trigger only fires for users whose
   `raw_user_meta_data.app = 'synchim'`. Every signup this app performs sets
   that marker, so users from your other apps in the same project never get
   a row in `synchim.users`. The opposite is also true: SyncHim users only
   show up in this app's queries.

Service-role inserts bypass RLS, which is how the diagnostic and PayPal
webhook write user data on the server.

## PayPal setup

1. Create a **Business** app in https://developer.paypal.com/dashboard/applications.
2. Copy `Client ID` and `Secret` into `.env.local`.
3. In the same dashboard, register a **webhook** pointing to `https://<your-domain>/api/paypal/webhook` with the event `PAYMENT.CAPTURE.COMPLETED`. Copy the webhook ID into `PAYPAL_WEBHOOK_ID`.
4. Test the full sandbox flow before switching `PAYPAL_MODE=live`.

## Resend setup

1. Verify a sending domain in Resend.
2. Set `RESEND_FROM` to a verified address (e.g. `Marina <marina@your-domain>`).
3. The first email a user receives is a Supabase magic link rendered through Resend's API.

## Vercel deploy (current host)

The repository targets Vercel. Push to `main`, Vercel auto-deploys. Set every env var from the table above in **Project → Settings → Environment Variables** for both Production and Preview.

### Admin studio extras

The admin studio (`/admin`) needs these in addition:

| Var | Why |
|---|---|
| `ADMIN_EMAILS` | Comma-separated allow-list of emails that can log in to `/admin/login` |
| `ADMIN_PASSWORD` | Shared password for that allow-list. Also signs the admin cookie |
| `SUPABASE_STORAGE_BUCKET` | Bucket for carousel/video render outputs (default `synchim-assets`) |
| `GITHUB_DISPATCH_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME`, `GITHUB_DISPATCH_REF` | For GitHub Actions render workflow |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL` | For voice generation on video render |

If `ADMIN_EMAILS` or `ADMIN_PASSWORD` are missing the admin login refuses the request with `credenciais inválidas`.

### Magic-link fallback (preview without Resend)

When `RESEND_API_KEY` is missing or still set to a placeholder, the magic-link login endpoint returns the action link in the JSON response and the login form renders it on screen. This makes the funnel testable end to end on preview deployments without a real Resend setup. As soon as a valid key lands, behaviour reverts to "email sent, check inbox".

### PWA

`public/manifest.webmanifest`, `public/sw.js`, and `<PwaRegistration />` in the root layout register a service worker on https + localhost. The worker caches static assets (`/_next/static`, images, fonts, css, js) cache-first and serves cached pages on offline navigations. Cache name is versioned so a redeploy evicts the previous one. API and Next data URLs bypass the worker.

To install: open the site on Chrome/Edge desktop or any mobile browser, then "Add to Home Screen" / "Install app".

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

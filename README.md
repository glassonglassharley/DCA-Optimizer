# DCA Optimizer with News Feed

A Next.js app for DCA portfolio optimization with real-time news sentiment analysis.

## Features

- 📊 Multi-ticker portfolio analysis
- 📰 Real-time news feed from CoinDesk, CoinTelegraph, Decrypt
- 🎯 Sentiment analysis (positive/negative/neutral)
- 🔔 Breaking news alerts
- 💰 Live price tracking via CoinGecko
- 🧠 DCA optimization signals

## Quick Start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

## Authentication and data

Sign-in is **Clerk** (email). Watchlists and portfolios live in **Supabase**,
owned by `clerk_user_id` — not by a typed username.

### 1. Run the schema

Paste `supabase-portfolios.sql` into the Supabase SQL editor and run it. It
creates `portfolios` and `portfolio_items`, enables RLS with no anon policies,
and revokes anon on both. It is idempotent.

### 2. Set environment variables

See `.env.example`. Copy it to `.env.local` and fill in real values.

| Variable | Prefix | Source |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **`NEXT_PUBLIC_`** | Clerk → API Keys → Publishable key |
| `CLERK_SECRET_KEY` | none (server-only) | Clerk → API Keys → Secret key |
| `SUPABASE_URL` | none (server-only) | Supabase → Project Settings → Data API |
| `SUPABASE_SERVICE_ROLE_KEY` | none (server-only) | same page → `service_role` |
| `SUPABASE_ANON_KEY` | none (server-only) | legacy `/api/sync` only — remove after import |

All of these go in Vercel under Project Settings → Environment Variables for
**Production and Preview**.

The build fails without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — `ClerkProvider`
throws during prerender rather than degrading.

### 3. Security model

The browser never talks to Supabase. Every read and write goes through an
`/api/*` route that calls `getAuth(req)` for a Clerk-verified `userId`, and every
query filters on it. `service_role` bypasses RLS, so **that filter is the
ownership boundary** — a query missing it would expose other users' rows.

### 4. Importing pre-login data

`/api/claim` is a one-time migration endpoint. Sources are hardcoded, it refuses
to run once the account has any portfolios, and it normalizes both the string
and legacy `{symbol, tag, dca}` storage formats.

Retire it after use: delete `pages/api/claim.js` and the Import panel in
`pages/index.js`, then run the legacy lockdown block at the bottom of
`supabase-portfolios.sql` to revoke anon on `public.tickers`.

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

## API Endpoints

### GET /api/news?tickers=BTC,ETH,SOL
Returns news articles with sentiment analysis for each ticker.

### GET /api/prices?tickers=BTC,ETH,SOL
Returns current prices from CoinGecko.

## News Sources

- CoinDesk RSS
- CoinTelegraph RSS
- Decrypt RSS

## Sentiment Keywords

**Positive:** bull, rally, surge, breakout, adoption, ETF, approval, upgrade, partnership

**Negative:** bear, crash, dump, hack, exploit, ban, SEC, lawsuit, fraud

## Integration with Harley Automation

This app integrates with the Harley Automation System:
- Tax logging via `tax-log-agent.js`
- Portfolio tracking in Monday reports
- Signal routing through DCA optimizer

## License

MIT

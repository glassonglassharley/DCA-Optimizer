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

## Watchlist sync setup

Watchlists are keyed by username in a single Supabase table. Sync needs two
environment variables — see `.env.example`:

| Variable | Where to find it |
| --- | --- |
| `SUPABASE_URL` | Supabase dashboard → Project Settings → Data API |
| `SUPABASE_ANON_KEY` | same page, the **anon/public** key (never `service_role`) |

Set both locally in `.env.local` and on Vercel under Project Settings →
Environment Variables, for **Production and Preview**.

Use these names exactly — **no `NEXT_PUBLIC_` prefix**. Both are read server-side
only, in `lib/supabaseSync.js` via the `/api/sync` route; the browser never sees
them and never needs to. Prefixing the names would leave `process.env.SUPABASE_URL`
undefined and `/api/sync` would return `503 sync_unconfigured`.

For a new project, run `supabase-schema.sql` in the Supabase SQL editor. It creates the
`tickers` table, the UNIQUE constraint on `username` that the upsert depends on,
and the anon RLS policy.

**If sync is not configured or the project is unreachable**, the app still works:
it falls back to a per-username `localStorage` cache and shows a red "Not syncing"
banner. Nothing is silently lost, but changes stay on that one device until sync
is restored. Check the browser console and function logs for `[sync]` lines —
`sync_unconfigured` means the env vars are missing, `sync_unreachable` means the
Supabase project is down, paused, or deleted.

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

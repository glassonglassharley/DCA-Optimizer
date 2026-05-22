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
npm run dev
```

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

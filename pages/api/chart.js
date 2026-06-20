const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const CRYPTO_SYMBOL_MAP = {
  BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', HYPE: 'HYPE-USD',
  BNB: 'BNB-USD', ADA: 'ADA-USD', DOGE: 'DOGE-USD', AVAX: 'AVAX-USD',
  XRP: 'XRP-USD', LTC: 'LTC-USD', LINK: 'LINK-USD', DOT: 'DOT-USD',
};

// days lookback + interval per period
const PERIOD_CONFIG = {
  '1D': { days: 2,    interval: '1h'  },
  '1W': { days: 7,    interval: '1h'  },
  '1M': { days: 35,   interval: '1d'  },
  '3M': { days: 100,  interval: '1d'  },
  '1Y': { days: 370,  interval: '1wk' },
  '5Y': { days: 1826, interval: '1mo' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  const { symbol, period = '1M' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const yahooSym = CRYPTO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();
  const cfg = PERIOD_CONFIG[period] || PERIOD_CONFIG['1M'];

  const now = Math.floor(Date.now() / 1000);
  const period1 = now - cfg.days * 24 * 60 * 60;

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?period1=${period1}&period2=${now}&interval=${cfg.interval}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9' },
    });
    const data = await r.json();
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'No data' });

    const rawCloses = result.indicators?.quote?.[0]?.close || [];
    const closes = rawCloses.filter(v => v != null && !isNaN(v));
    if (!closes.length) return res.status(404).json({ error: 'No price data' });

    return res.json({ closes, period });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

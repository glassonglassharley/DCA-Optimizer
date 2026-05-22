/**
 * Prices API with Rate Limiting
 */

// Rate limiter for CoinGecko
const rateLimit = {
  lastCall: 0,
  minInterval: 6000 // 6 seconds between calls (10/min)
};

// Simple API auth
function validateAuth(req) {
  const config = require('../../config.json');
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  return token === config.apiSecret;
}

// CoinGecko ID mapping
const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  HYPE: 'hyperliquid' // May need adjustment
};

export default async function handler(req, res) {
  // Auth check
  if (!validateAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { tickers } = req.query;
  
  if (!tickers) {
    return res.status(400).json({ error: 'Missing tickers' });
  }
  
  const tickerList = tickers.split(',').map(t => t.toUpperCase().trim());
  
  // Rate limit check
  const now = Date.now();
  if (now - rateLimit.lastCall < rateLimit.minInterval) {
    const wait = rateLimit.minInterval - (now - rateLimit.lastCall);
    console.log(`Rate limited, waiting ${wait}ms`);
    await new Promise(r => setTimeout(r, wait));
  }
  rateLimit.lastCall = Date.now();
  
  try {
    // Map tickers to CoinGecko IDs
    const ids = tickerList
      .map(t => COINGECKO_IDS[t])
      .filter(Boolean)
      .join(',');
    
    if (!ids) {
      return res.status(400).json({ error: 'No valid tickers' });
    }
    
    // Fetch from CoinGecko
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    
    const resp = await fetch(url);
    
    if (!resp.ok) {
      throw new Error(`CoinGecko error: ${resp.status}`);
    }
    
    const data = await resp.json();
    
    // Map back to tickers
    const prices = {};
    for (const ticker of tickerList) {
      const id = COINGECKO_IDS[ticker];
      if (data[id]) {
        prices[ticker] = {
          price: data[id].usd,
          change24h: data[id].usd_24h_change || 0
        };
      }
    }
    
    res.json({ prices, timestamp: new Date().toISOString() });
    
  } catch (e) {
    console.error('Prices API error:', e);
    res.status(500).json({ error: e.message });
  }
}

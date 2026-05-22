const CRYPTO_SYMBOL_MAP = {
  BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', HYPE: 'HYPE-USD',
  BNB: 'BNB-USD', ADA: 'ADA-USD', DOGE: 'DOGE-USD', AVAX: 'AVAX-USD',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function calcRSIForEach(closes, period = 14) {
  const rsis = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return rsis;

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;

  rsis[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    rsis[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsis;
}

function isBuyDay(dateStr, frequency, buyDay) {
  const d = new Date(dateStr);
  if (frequency === 'weekly') {
    return d.getDay() === parseInt(buyDay); // buyDay: 1=Mon, 2=Tue, ..., 5=Fri
  } else {
    // Monthly: buy on the first trading day at or after the target day-of-month
    return d.getDate() === parseInt(buyDay);
  }
}

function simulateDCA(dates, closes, rsis, amount, frequency, rsiThreshold, buyDay, smart) {
  if (!dates.length) return null;

  let totalInvested = 0;
  let totalUnits = 0;
  let buyCount = 0;
  const timeline = [];

  // For monthly: track which months we've already bought in
  const boughtMonths = new Set();

  for (let i = 0; i < dates.length; i++) {
    const price = closes[i];
    const rsi = rsis[i];
    const d = new Date(dates[i]);

    let shouldBuy = false;
    if (frequency === 'weekly') {
      shouldBuy = isBuyDay(dates[i], 'weekly', buyDay);
    } else {
      // Monthly: buy on or after buyDay in each calendar month
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!boughtMonths.has(monthKey) && d.getDate() >= parseInt(buyDay)) {
        shouldBuy = true;
        boughtMonths.add(monthKey);
      }
    }

    if (shouldBuy) {
      const qualifies = !smart || (rsi != null && rsi < rsiThreshold);
      if (qualifies && price) {
        totalInvested += amount;
        totalUnits += amount / price;
        buyCount++;
      }
    }

    const avgCostBasis = totalUnits > 0 ? totalInvested / totalUnits : null;
    timeline.push({ date: dates[i], costBasis: avgCostBasis });
  }

  const currentPrice = closes[closes.length - 1];
  const portfolioValue = totalUnits * currentPrice;
  const avgCostBasis = totalUnits > 0 ? totalInvested / totalUnits : 0;

  return { totalInvested, totalUnits, avgCostBasis, portfolioValue, buyCount, timeline };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol, period = '6m', rsiThreshold = '35', amount = '100', frequency = 'weekly', buyDay = '1' } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const yahooSymbol = CRYPTO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();
  const monthsBack = period === '12m' ? 12 : 6;
  const threshold = parseFloat(rsiThreshold);
  const buyAmount = parseFloat(amount);

  // Fetch period + 2 months buffer so RSI seeds properly
  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - (monthsBack + 2) * 30 * 24 * 60 * 60;

  try {
    const resp = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`,
      { headers: { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9' } }
    );
    const data = await resp.json();

    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'No data found for this symbol' });

    const timestamps = result.timestamp || [];
    const rawCloses = result.indicators?.quote?.[0]?.close || [];

    const allDates = [], allCloses = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (rawCloses[i] != null) {
        allDates.push(new Date(timestamps[i] * 1000).toISOString().split('T')[0]);
        allCloses.push(rawCloses[i]);
      }
    }

    if (!allDates.length) return res.status(404).json({ error: 'No price data available' });

    const allRSIs = calcRSIForEach(allCloses);

    // Trim to requested period (trading days)
    const tradingDaysTarget = monthsBack === 6 ? 126 : 252;
    const startIdx = Math.max(0, allDates.length - tradingDaysTarget);
    const dates = allDates.slice(startIdx);
    const closes = allCloses.slice(startIdx);
    const rsis = allRSIs.slice(startIdx);

    const currentPrice = closes[closes.length - 1];

    const blind = simulateDCA(dates, closes, rsis, buyAmount, frequency, threshold, buyDay, false);
    const smart = simulateDCA(dates, closes, rsis, buyAmount, frequency, threshold, buyDay, true);

    // Sparse timeline for chart (every 5 points)
    const sparseTimeline = (tl) => tl.filter((_, i) => i % 5 === 0 || i === tl.length - 1);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json({
      symbol: symbol.toUpperCase(),
      currentPrice,
      blind: { ...blind, timeline: sparseTimeline(blind.timeline) },
      smart: { ...smart, timeline: sparseTimeline(smart.timeline) },
    });
  } catch (err) {
    console.error('Calculator error:', err);
    return res.status(500).json({ error: err.message });
  }
}

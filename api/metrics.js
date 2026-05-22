const CRYPTO_SYMBOL_MAP = {
    BTC: 'BTC-USD', ETH: 'ETH-USD', SOL: 'SOL-USD', HYPE: 'HYPE-USD',
    BNB: 'BNB-USD', ADA: 'ADA-USD', DOGE: 'DOGE-USD', AVAX: 'AVAX-USD',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function calcRSI(closes, period = 14) {
    const valid = (closes || []).filter(c => c != null && !isNaN(c));
    if (valid.length < period + 1) return null;
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const d = valid[i] - valid[i - 1];
        if (d > 0) avgGain += d; else avgLoss -= d;
    }
    avgGain /= period;
    avgLoss /= period;
    for (let i = period + 1; i < valid.length; i++) {
        const d = valid[i] - valid[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    }
    if (avgLoss === 0) return 100;
    return Math.round(100 - 100 / (1 + avgGain / avgLoss));
}

function calcEMA72(closes) {
  const valid = (closes || []).filter(c => c != null && !isNaN(c));
  if (valid.length < 72) return null;
  const k = 2 / (72 + 1);
  let ema = valid.slice(0, 72).reduce((s, v) => s + v, 0) / 72;
  for (let i = 72; i < valid.length; i++) {
    ema = valid[i] * k + ema * (1 - k);
  }
  return parseFloat(ema.toFixed(4));
}

function calcSMA200(closes) {
  const valid = (closes || []).filter(c => c != null && !isNaN(c));
  if (valid.length < 200) return null;
  return parseFloat((valid.slice(-200).reduce((s, v) => s + v, 0) / 200).toFixed(4));
}

// Fetch a Yahoo Finance crumb — required for quoteSummary v10 since 2024
async function getYahooCrumb() {
    try {
        // Yahoo sets A3 cookie on this endpoint; we grab whatever cookies come back
        const init = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA } });
        const cookie = init.headers.get('set-cookie') || '';
        const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
            headers: { 'User-Agent': UA, 'Cookie': cookie },
        });
        if (crumbRes.ok) {
            const text = await crumbRes.text();
            if (text && text.length < 50) return { crumb: text, cookie };
        }
    } catch (_) {}
    return { crumb: null, cookie: '' };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const yahooSymbol = CRYPTO_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toUpperCase();

    try {
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - 300 * 24 * 60 * 60; // ~210 trading days needed for 200-day SMA

        const baseHeaders = { 'User-Agent': UA, 'Accept': '*/*', 'Accept-Language': 'en-US,en;q=0.9' };

        // Chart API (price + RSI) — tends to work without crumb
        const chartRes = await fetch(
            `https://query2.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`,
            { headers: baseHeaders }
        );
        const chartData = await chartRes.json();

        let rsi = null;
        let currentPrice = null;
        let regularMarketChangePercent = null;
        try {
            const q = chartData?.chart?.result?.[0];
            if (q) {
                const closes = q.indicators?.quote?.[0]?.close;
                rsi = calcRSI(closes);
                currentPrice = q.meta?.regularMarketPrice || closes?.[closes.length - 1] || null;
                const prev = q.meta?.previousClose || q.meta?.chartPreviousClose;
                if (currentPrice && prev) regularMarketChangePercent = ((currentPrice - prev) / prev) * 100;
            }
        } catch (_) {}

        let ma72 = null, ma200 = null;
        try {
          const closes = chartData?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
          ma72 = calcEMA72(closes);
          ma200 = calcSMA200(closes);
        } catch (_) {}
        const aboveMa72 = (ma72 != null && currentPrice != null) ? currentPrice > ma72 : null;
        const aboveMa200 = (ma200 != null && currentPrice != null) ? currentPrice > ma200 : null;

        // If chart returned no price, symbol is invalid
        if (!currentPrice) {
            return res.status(404).json({ error: 'No data found' });
        }

        // Try quoteSummary for rich fundamentals — requires crumb
        let quoteSummaryResult = null;
        const { crumb, cookie } = await getYahooCrumb();
        if (crumb) {
            try {
                const qs = await fetch(
                    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${yahooSymbol}?modules=price,summaryDetail,defaultKeyStatistics,financialData,recommendationTrend&crumb=${encodeURIComponent(crumb)}`,
                    { headers: { ...baseHeaders, 'Cookie': cookie } }
                );
                const qsData = await qs.json();
                if (qsData?.quoteSummary?.result?.[0]) quoteSummaryResult = qsData.quoteSummary.result[0];
            } catch (_) {}
        }

        // Yahoo Finance wraps numbers as {raw, fmt} — unwrap them
        const rv = (v) => (v == null ? null : typeof v === 'number' ? v : (v?.raw ?? null));

        // Build response — chart data is the floor, quoteSummary enriches it
        const price = quoteSummaryResult?.price || {};
        const summary = quoteSummaryResult?.summaryDetail || {};
        const stats = quoteSummaryResult?.defaultKeyStatistics || {};
        const financial = quoteSummaryResult?.financialData || {};
        const trend = quoteSummaryResult?.recommendationTrend?.trend?.[0] || {};

        const finalPrice = rv(price.regularMarketPrice) || currentPrice;
        const finalChg = rv(price.regularMarketChangePercent) || regularMarketChangePercent;

        const forwardPE = rv(summary.forwardPE);
        const fiftyTwoWeekHigh = rv(summary.fiftyTwoWeekHigh);
        const fiftyTwoWeekLow = rv(summary.fiftyTwoWeekLow);
        const targetPrice = rv(financial.targetMeanPrice);
        const upside = (targetPrice && finalPrice) ? ((targetPrice / finalPrice - 1) * 100).toFixed(2) : null;
        const distFromHigh = fiftyTwoWeekHigh ? ((finalPrice / fiftyTwoWeekHigh - 1) * 100).toFixed(2) : null;
        const distFromLow = fiftyTwoWeekLow ? ((finalPrice / fiftyTwoWeekLow - 1) * 100).toFixed(2) : null;

        const strongBuy = rv(trend.strongBuy) || 0;
        const buy = rv(trend.buy) || 0;
        const hold = rv(trend.hold) || 0;
        const sell = rv(trend.sell) || 0;
        const strongSell = rv(trend.strongSell) || 0;
        const totalAnalysts = strongBuy + buy + hold + sell + strongSell;

        let rating = 'HOLD';
        let ratingScore = 50;
        if (totalAnalysts > 0) {
            const bs = ((strongBuy * 100) + (buy * 75) + (hold * 50) + (sell * 25)) / totalAnalysts;
            ratingScore = Math.round(bs);
            if (ratingScore >= 75) rating = 'STRONG BUY';
            else if (ratingScore >= 60) rating = 'BUY';
            else if (ratingScore >= 40) rating = 'HOLD';
            else if (ratingScore >= 25) rating = 'SELL';
            else rating = 'STRONG SELL';
        }

        const name = price.shortName || price.longName || symbol.toUpperCase();

        res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
        return res.status(200).json({
            symbol: symbol.toUpperCase(),
            name,
            currentPrice: finalPrice,
            regularMarketChangePercent: finalChg,
            currency: price.currency || 'USD',
            exchange: price.exchangeName || '',
            marketCap: price.marketCap || stats.marketCap || null,
            peRatio: rv(summary.trailingPE) ? rv(summary.trailingPE).toFixed(2) : null,
            forwardPE: forwardPE ? forwardPE.toFixed(2) : null,
            pegRatio: rv(stats.pegRatio) ? rv(stats.pegRatio).toFixed(2) : null,
            priceToBook: (rv(summary.priceToBook) || rv(stats.priceToBook)) ? (rv(summary.priceToBook) || rv(stats.priceToBook)).toFixed(2) : null,
            dividendYield: rv(summary.dividendYield) ? (rv(summary.dividendYield) * 100).toFixed(2) : null,
            beta: rv(stats.beta) ? rv(stats.beta).toFixed(2) : null,
            fiftyTwoWeekHigh,
            fiftyTwoWeekLow,
            fiftyDayMA: rv(summary.fiftyDayAverage),
            twoHundredDayMA: rv(summary.twoHundredDayAverage),
            distFromHigh,
            distFromLow,
            rsi,
            ma72: ma72 ? parseFloat(ma72.toFixed(2)) : null,
            ma200: ma200 ? parseFloat(ma200.toFixed(2)) : null,
            aboveMa72,
            aboveMa200,
            rating,
            ratingScore,
            analysts: { strongBuy, buy, hold, sell, strongSell, total: totalAnalysts },
            targetPrice,
            upside,
        });

    } catch (error) {
        console.error('Metrics error:', error);
        return res.status(500).json({ error: error.message });
    }
}

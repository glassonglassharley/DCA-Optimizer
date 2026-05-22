export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { symbol } = req.query;
    
    if (!symbol) {
        return res.status(400).json({ error: 'Symbol required' });
    }
    
    try {
        // Fetch from Yahoo Finance - recommendation trends
        const response = await fetch(
            `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=recommendationTrend,financialData`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        
        if (data.quoteSummary && data.quoteSummary.result && data.quoteSummary.result[0]) {
            const result = data.quoteSummary.result[0];
            const trend = result.recommendationTrend?.trend?.[0] || {};
            const financialData = result.financialData || {};
            
            // Calculate overall rating
            const strongBuy = trend.strongBuy || 0;
            const buy = trend.buy || 0;
            const hold = trend.hold || 0;
            const sell = trend.sell || 0;
            const strongSell = trend.strongSell || 0;
            
            const total = strongBuy + buy + hold + sell + strongSell;
            
            let rating = 'HOLD';
            let score = 50;
            
            if (total > 0) {
                const buyScore = ((strongBuy * 100) + (buy * 75) + (hold * 50) + (sell * 25) + (strongSell * 0)) / total;
                score = Math.round(buyScore);
                
                if (score >= 75) rating = 'STRONG BUY';
                else if (score >= 60) rating = 'BUY';
                else if (score >= 40) rating = 'HOLD';
                else if (score >= 25) rating = 'SELL';
                else rating = 'STRONG SELL';
            }
            
            // Target price
            const targetPrice = financialData.targetMeanPrice || null;
            const currentPrice = financialData.currentPrice || null;
            const upside = (targetPrice && currentPrice) ? ((targetPrice / currentPrice - 1) * 100) : null;
            
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
            return res.status(200).json({
                symbol,
                rating,
                score,
                analysts: {
                    strongBuy,
                    buy,
                    hold,
                    sell,
                    strongSell,
                    total
                },
                targetPrice,
                currentPrice,
                upside: upside ? upside.toFixed(2) : null
            });
        }
        
        // Fallback rating based on symbol type
        const fallbackRatings = {
            'VOO': { rating: 'BUY', score: 72 },
            'QQQ': { rating: 'BUY', score: 68 },
            'IBIT': { rating: 'HOLD', score: 55 },
            'GLD': { rating: 'HOLD', score: 52 },
            'COST': { rating: 'BUY', score: 75 },
            'WMT': { rating: 'BUY', score: 70 },
            'XLV': { rating: 'BUY', score: 65 },
            'BTC-USD': { rating: 'HOLD', score: 58 }
        };
        
        const fb = fallbackRatings[symbol] || { rating: 'HOLD', score: 50 };
        
        return res.status(200).json({
            symbol,
            rating: fb.rating,
            score: fb.score,
            analysts: { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0, total: 0 },
            targetPrice: null,
            currentPrice: null,
            upside: null,
            fallback: true
        });
        
    } catch (error) {
        console.error('Rating fetch error:', error);
        return res.status(500).json({ 
            error: error.message, 
            symbol,
            rating: 'HOLD',
            score: 50,
            fallback: true
        });
    }
}

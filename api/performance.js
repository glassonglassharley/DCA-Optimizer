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
    
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (365 * 24 * 60 * 60); // 1 year
    
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${startDate}&period2=${endDate}&interval=1wk`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const quotes = result.indicators.quote[0];
            const closes = quotes.close || [];
            
            // Calculate performance
            const currentPrice = closes[closes.length - 1];
            const yearAgoPrice = closes[0];
            const ytdPrice = closes[Math.floor(closes.length * 0.5)]; // ~6 months ago
            
            const oneYearReturn = ((currentPrice / yearAgoPrice) - 1) * 100;
            const sixMonthReturn = ((currentPrice / ytdPrice) - 1) * 100;
            
            // Calculate volatility (standard deviation of weekly returns)
            const returns = [];
            for (let i = 1; i < closes.length; i++) {
                if (closes[i-1] && closes[i]) {
                    returns.push((closes[i] - closes[i-1]) / closes[i-1]);
                }
            }
            
            const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance) * Math.sqrt(52) * 100; // Annualized
            
            // Calculate max drawdown
            let maxPrice = 0;
            let maxDrawdown = 0;
            for (const price of closes) {
                if (price > maxPrice) maxPrice = price;
                const drawdown = ((maxPrice - price) / maxPrice) * 100;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            }
            
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
            return res.status(200).json({
                symbol,
                currentPrice,
                oneYearReturn: oneYearReturn.toFixed(2),
                sixMonthReturn: sixMonthReturn.toFixed(2),
                volatility: volatility.toFixed(2),
                maxDrawdown: maxDrawdown.toFixed(2),
                weeks: closes.length
            });
        }
        
        return res.status(404).json({ error: 'No data found' });
    } catch (error) {
        console.error('Performance fetch error:', error);
        return res.status(500).json({ error: error.message });
    }
}

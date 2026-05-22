export default async function handler(req, res) {
    // Enable CORS
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
    
    const upperSymbol = symbol.toUpperCase().trim();
    
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - (30 * 24 * 60 * 60);
    
    try {
        // Try Yahoo Finance first
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${upperSymbol}?period1=${startDate}&period2=${endDate}&interval=1d`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            }
        );
        
        const data = await response.json();
        
        if (data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const quotes = result.indicators.quote[0];
            const timestamps = result.timestamp || [];
            const closes = quotes.close || [];
            
            // Build price array with timestamps
            const prices = closes.map((price, i) => ({
                date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                price: price
            })).filter(p => p.price !== null);
            
            if (prices.length === 0) {
                return res.status(404).json({ error: 'No price data available', symbol: upperSymbol });
            }
            
            res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600, max-age=300');
            return res.status(200).json({ 
                symbol: upperSymbol,
                prices: prices.map(p => p.price),
                dates: prices.map(p => p.date),
                currentPrice: closes[closes.length - 1],
                previousClose: closes[closes.length - 2],
                change: ((closes[closes.length - 1] / closes[closes.length - 2]) - 1) * 100,
                timestamp: Date.now(),
                source: 'yahoo'
            });
        }
        
        // Check for Yahoo error
        if (data.chart && data.chart.error) {
            console.error('Yahoo error:', data.chart.error);
            return res.status(404).json({ 
                error: data.chart.error.description || 'Symbol not found', 
                symbol: upperSymbol 
            });
        }
        
        return res.status(404).json({ error: 'No data found for symbol', symbol: upperSymbol });
        
    } catch (error) {
        console.error('Price fetch error:', error);
        return res.status(500).json({ error: error.message, symbol: upperSymbol });
    }
}

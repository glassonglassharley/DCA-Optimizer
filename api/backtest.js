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
    const startDate = endDate - (365 * 10 * 24 * 60 * 60); // 10 years for backtesting
    
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
            const timestamps = result.timestamp || [];
            const quotes = result.indicators.quote[0];
            const closes = quotes.close || [];
            
            // Build historical data
            const history = timestamps.map((ts, i) => ({
                date: new Date(ts * 1000).toISOString().split('T')[0],
                price: closes[i]
            })).filter(h => h.price !== null);
            
            // Simulate DCA over different periods
            const simulateDCA = (weeks, weeklyAmount) => {
                if (history.length < weeks) return null;
                
                const relevantHistory = history.slice(-weeks);
                let totalInvested = 0;
                let shares = 0;
                
                relevantHistory.forEach(h => {
                    totalInvested += weeklyAmount;
                    shares += weeklyAmount / h.price;
                });
                
                const currentValue = shares * history[history.length - 1].price;
                const profit = currentValue - totalInvested;
                const roi = ((currentValue / totalInvested) - 1) * 100;
                
                return {
                    totalInvested: totalInvested.toFixed(2),
                    shares: shares.toFixed(4),
                    currentValue: currentValue.toFixed(2),
                    profit: profit.toFixed(2),
                    roi: roi.toFixed(2)
                };
            };
            
            // Backtest multiple strategies
            const weeklyAmount = 50; // $50/week default
            const backtests = {
                '1y': simulateDCA(52, weeklyAmount),
                '3y': simulateDCA(156, weeklyAmount),
                '5y': simulateDCA(260, weeklyAmount),
                '10y': simulateDCA(520, weeklyAmount)
            };
            
            // Calculate metrics
            const prices = closes.filter(p => p !== null);
            const currentPrice = prices[prices.length - 1];
            
            // Volatility (annualized)
            const returns = [];
            for (let i = 1; i < prices.length; i++) {
                if (prices[i-1] && prices[i]) {
                    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
                }
            }
            const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
            const volatility = Math.sqrt(variance) * Math.sqrt(52) * 100;
            
            // Sharpe Ratio (assuming 5% risk-free rate)
            const riskFreeRate = 0.05;
            const annualizedReturn = avgReturn * 52;
            const sharpeRatio = (annualizedReturn - riskFreeRate) / (volatility / 100);
            
            // Max Drawdown
            let maxPrice = 0;
            let maxDrawdown = 0;
            for (const price of prices) {
                if (price > maxPrice) maxPrice = price;
                const drawdown = ((maxPrice - price) / maxPrice) * 100;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            }
            
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
            return res.status(200).json({
                symbol,
                currentPrice,
                volatility: volatility.toFixed(2),
                sharpeRatio: sharpeRatio.toFixed(2),
                maxDrawdown: maxDrawdown.toFixed(2),
                backtests,
                dataPoints: history.length
            });
        }
        
        return res.status(404).json({ error: 'No data found' });
    } catch (error) {
        console.error('Backtest error:', error);
        return res.status(500).json({ error: error.message });
    }
}

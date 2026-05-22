export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { message, tickers } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message required' });
    }
    
    // Build context with user's tickers
    let context = 'You are a helpful financial assistant for a DCA (Dollar Cost Averaging) portfolio app. ';
    context += 'Give concise, practical advice. Focus on long-term investing principles. ';
    context += 'Never give specific financial advice, only educational information. ';
    
    if (tickers && tickers.length > 0) {
        context += `The user is tracking these tickers: ${tickers.join(', ')}. `;
    }
    
    try {
        // Use Perplexity API (free tier available)
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || 'pplx-demo'}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    { role: 'system', content: context },
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            // Fallback to simulated response if API fails
            const fallbackResponse = generateFallbackResponse(message, tickers);
            return res.status(200).json({ response: fallbackResponse });
        }
        
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';
        
        return res.status(200).json({ response: reply });
        
    } catch (error) {
        console.error('Chat error:', error);
        const fallbackResponse = generateFallbackResponse(message, tickers);
        return res.status(200).json({ response: fallbackResponse });
    }
}

function generateFallbackResponse(message, tickers) {
    const lower = message.toLowerCase();
    
    if (lower.includes('dca') || lower.includes('dollar cost')) {
        return 'Dollar Cost Averaging (DCA) is a strategy where you invest a fixed amount regularly, regardless of price. This reduces the impact of volatility and removes the need to time the market. It works best over long periods (5+ years) with diversified assets.';
    }
    
    if (lower.includes('rsi') || lower.includes('oversold')) {
        return 'RSI (Relative Strength Index) measures momentum. RSI below 30 suggests oversold conditions (potential buy opportunity). RSI above 70 suggests overbought conditions (potential sell signal). However, RSI alone is not enough - always consider fundamentals and your time horizon.';
    }
    
    if (lower.includes('buy') || lower.includes('sell')) {
        return 'I cannot give specific buy/sell advice. However, the general principle is: buy when assets are undervalued (low RSI, negative sentiment) and hold for the long term. Your DCA strategy automatically handles timing by spreading purchases over time.';
    }
    
    if (lower.includes('diversif')) {
        return 'Diversification reduces risk by spreading investments across different assets. A good starting point: 60% stocks (mix of US and international), 20% bonds, 10% real estate, 10% alternatives. Adjust based on your risk tolerance and time horizon.';
    }
    
    if (tickers && tickers.length > 0) {
        return `Based on your watchlist (${tickers.slice(0, 5).join(', ')}), focus on assets with low RSI (oversold) for potential DCA entries. Remember to diversify across sectors and asset classes.`;
    }
    
    return 'I can help with DCA strategies, RSI interpretation, portfolio diversification, and general investing concepts. Ask me anything about your portfolio!';
}

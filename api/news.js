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
        // Fetch news from Yahoo Finance
        const response = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=5&enableFuzzyQuery=false`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            }
        );
        
        const data = await response.json();
        
        if (data.news && data.news.length > 0) {
            const news = data.news.map(item => ({
                title: item.title,
                publisher: item.publisher,
                link: item.link,
                published: new Date(item.providerPublishTime * 1000).toLocaleDateString(),
                thumbnail: item.thumbnail?.resolutions?.[0]?.url || null
            }));
            
            res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
            return res.status(200).json({ symbol, news });
        }
        
        return res.status(200).json({ symbol, news: [] });
    } catch (error) {
        console.error('News fetch error:', error);
        return res.status(500).json({ error: error.message, symbol, news: [] });
    }
}

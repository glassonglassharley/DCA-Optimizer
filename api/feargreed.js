export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Alternative.me Fear & Greed API (free, no key needed)
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        
        if (data.data && data.data[0]) {
            const fng = data.data[0];
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
            return res.status(200).json({
                value: parseInt(fng.value),
                classification: fng.value_classification,
                timestamp: fng.timestamp
            });
        }
        
        return res.status(200).json({
            value: 50,
            classification: 'Neutral',
            fallback: true
        });
    } catch (error) {
        console.error('Fear & Greed error:', error);
        return res.status(200).json({
            value: 50,
            classification: 'Neutral',
            fallback: true
        });
    }
}

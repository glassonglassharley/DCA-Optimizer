export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Try CNN Fear & Greed Index first
    try {
        const cnnRes = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (cnnRes.ok) {
            const cnnData = await cnnRes.json();
            const score = cnnData?.fear_and_greed?.score;
            const rating = cnnData?.fear_and_greed?.rating;
            if (score != null) {
                res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
                return res.status(200).json({
                    value: Math.round(score),
                    classification: rating || 'Neutral',
                    source: 'cnn',
                });
            }
        }
    } catch (_) {}

    // Fallback: Alternative.me (crypto-focused)
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        if (data.data && data.data[0]) {
            const fng = data.data[0];
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
            return res.status(200).json({
                value: parseInt(fng.value),
                classification: fng.value_classification,
                source: 'alternative.me',
            });
        }
    } catch (_) {}

    return res.status(200).json({ value: 50, classification: 'Neutral', fallback: true });
}

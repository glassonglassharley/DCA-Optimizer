async function fetchWithTimeout(url, options = {}, ms = 5000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
        const res = await fetch(url, { ...options, signal: ctrl.signal });
        clearTimeout(timer);
        return res;
    } catch (e) {
        clearTimeout(timer);
        throw e;
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Try Alternative.me first — no auth required, reliable from server
    try {
        const altRes = await fetchWithTimeout('https://api.alternative.me/fng/?limit=1');
        console.log('[feargreed] alternative.me status:', altRes.status);
        if (altRes.ok) {
            const data = await altRes.json();
            if (data.data && data.data[0]) {
                const fng = data.data[0];
                console.log('[feargreed] alternative.me value:', fng.value, fng.value_classification);
                res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
                return res.status(200).json({
                    value: parseInt(fng.value),
                    classification: fng.value_classification,
                    source: 'alternative.me',
                });
            }
        }
    } catch (e) {
        console.log('[feargreed] alternative.me error:', e.message);
    }

    // Fallback: CNN Fear & Greed
    try {
        const cnnRes = await fetchWithTimeout('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://edition.cnn.com/',
                'Origin': 'https://edition.cnn.com',
            }
        });
        console.log('[feargreed] CNN status:', cnnRes.status);
        if (cnnRes.ok) {
            const cnnData = await cnnRes.json();
            const score = cnnData?.fear_and_greed?.score;
            const rating = cnnData?.fear_and_greed?.rating;
            console.log('[feargreed] CNN score:', score, 'rating:', rating);
            if (score != null) {
                res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
                return res.status(200).json({
                    value: Math.round(score),
                    classification: rating || 'Neutral',
                    source: 'cnn',
                });
            }
        }
    } catch (e) {
        console.log('[feargreed] CNN error:', e.message);
    }

    console.log('[feargreed] both sources failed');
    // No cache on failure — let the next request try again
    return res.status(200).json({ value: null, classification: null, fallback: true });
}

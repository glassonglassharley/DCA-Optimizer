const Parser = require('rss-parser');
const parser = new Parser();

export default async function handler(req, res) {
    const raw = req.query.symbol || req.query.tickers || '';
    const symbol = raw.split(',')[0].toUpperCase().trim();
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    try {
        const query = encodeURIComponent(`${symbol} stock`);
        const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch(feedUrl, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        clearTimeout(timer);

        const text = await resp.text();
        const feed = await parser.parseString(text);

        const articles = feed.items.slice(0, 4).map(item => {
            const full = item.title || '';
            const lastDash = full.lastIndexOf(' - ');
            return {
                title: lastDash > 0 ? full.substring(0, lastDash) : full,
                url: item.link || '',
                source: lastDash > 0 ? full.substring(lastDash + 3) : 'Google News',
                publishedAt: item.pubDate || new Date().toISOString(),
            };
        });

        console.log(`[news] ${symbol}: ${articles.length} articles`);
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
        return res.status(200).json({ articles });
    } catch (e) {
        console.error('[news] error:', e.message);
        return res.status(200).json({ articles: [] });
    }
}

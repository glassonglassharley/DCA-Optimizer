// News handler v3 — ?symbol= param, Google News RSS, zero external deps
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const sym = (req.query.symbol || '').toUpperCase().trim();
    if (!sym) return res.status(400).json({ error: 'symbol param required', v: 3 });

    try {
        const query = encodeURIComponent(`${sym} stock`);
        const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch(feedUrl, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        clearTimeout(timer);

        const xml = await resp.text();

        const articles = [];
        const itemRe = /<item>([\s\S]*?)<\/item>/g;
        let m;
        while ((m = itemRe.exec(xml)) !== null && articles.length < 4) {
            const block = m[1];
            const titleRaw = (
                block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                block.match(/<title>([\s\S]*?)<\/title>/)
            )?.[1] || '';
            const link = (block.match(/<link>([\s\S]*?)<\/link>/))?.[1]?.trim() || '';
            const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() || '';

            // Google News title format: "Headline - Publisher Name"
            const lastDash = titleRaw.lastIndexOf(' - ');
            const title = lastDash > 0 ? titleRaw.substring(0, lastDash).trim() : titleRaw.trim();
            const source = lastDash > 0 ? titleRaw.substring(lastDash + 3).trim() : 'Google News';

            if (title) articles.push({ title, url: link, source, publishedAt: pubDate });
        }

        console.log(`[tickernews v3] ${sym}: ${articles.length} articles`);
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
        return res.status(200).json({ articles, v: 3 });
    } catch (e) {
        console.error('[tickernews v3] error:', e.message);
        return res.status(200).json({ articles: [], v: 3 });
    }
}

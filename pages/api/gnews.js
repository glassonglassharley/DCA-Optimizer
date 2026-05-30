// Google News RSS proxy — ?symbol=TICKER, returns up to 4 articles
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const sym = (req.query.symbol || '').toUpperCase().trim();
    if (!sym) return res.status(400).json({ error: 'symbol required', v: 1 });

    try {
        const q = encodeURIComponent(`${sym} stock`);
        const url = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
        clearTimeout(t);

        const xml = await r.text();
        const articles = [];
        const re = /<item>([\s\S]*?)<\/item>/g;
        let m;
        while ((m = re.exec(xml)) !== null && articles.length < 4) {
            const b = m[1];
            const raw = (
                b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
                b.match(/<title>([\s\S]*?)<\/title>/)
            )?.[1] || '';
            const link = b.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() || '';
            const pub = b.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || '';
            const dash = raw.lastIndexOf(' - ');
            const title = dash > 0 ? raw.substring(0, dash).trim() : raw.trim();
            const source = dash > 0 ? raw.substring(dash + 3).trim() : 'Google News';
            if (title) articles.push({ title, url: link, source, publishedAt: pub });
        }

        console.log(`[gnews] ${sym}: ${articles.length} articles`);
        res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
        return res.status(200).json({ articles, sym, v: 1 });
    } catch (e) {
        console.error(`[gnews] ${sym} error:`, e.message);
        return res.status(200).json({ articles: [], v: 1 });
    }
}

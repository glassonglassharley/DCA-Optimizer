// Supabase sync — username-keyed tickers store
const SUPABASE_URL = 'https://ofeoweiiiqkbezhzdbkm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZW93ZWlpaXFrYmV6aHpkYmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTk1NjYsImV4cCI6MjA4Nzg3NTU2Nn0.Mt2MWVavA_An66E5a-HUQ9BqOs_hOXc2ckPfY6iNWsU';

const BASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const username = req.method === 'GET'
        ? req.query.username
        : (req.body || {}).username;

    if (!username) return res.status(400).json({ error: 'Username required' });

    if (req.method === 'GET') {
        try {
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/tickers?username=eq.${encodeURIComponent(username)}&select=tickers,updated_at`,
                { headers: BASE_HEADERS }
            );
            const data = await r.json();
            // data is an array of rows; empty array means new user
            if (Array.isArray(data) && data.length > 0) {
                return res.status(200).json({
                    tickers: data[0].tickers || [],
                    updatedAt: data[0].updated_at || null,
                });
            }
            return res.status(200).json({ tickers: [], updatedAt: null });
        } catch (err) {
            // Supabase unreachable or table missing — let user in with empty list
            console.error('sync GET error:', err.message);
            return res.status(200).json({ tickers: [], updatedAt: null });
        }
    }

    if (req.method === 'POST') {
        const { tickers } = req.body || {};
        try {
            // Try upsert first (requires unique constraint on username)
            const r = await fetch(`${SUPABASE_URL}/rest/v1/tickers`, {
                method: 'POST',
                headers: {
                    ...BASE_HEADERS,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=minimal',
                },
                body: JSON.stringify({
                    username,
                    tickers: tickers || [],
                    updated_at: new Date().toISOString(),
                }),
            });
            if (!r.ok) {
                // Upsert failed (likely no unique constraint yet) — fall back to insert-or-patch
                const existing = await fetch(
                    `${SUPABASE_URL}/rest/v1/tickers?username=eq.${encodeURIComponent(username)}&select=id`,
                    { headers: BASE_HEADERS }
                ).then(x => x.json()).catch(() => []);

                const method = Array.isArray(existing) && existing.length > 0 ? 'PATCH' : 'POST';
                const url = method === 'PATCH'
                    ? `${SUPABASE_URL}/rest/v1/tickers?username=eq.${encodeURIComponent(username)}`
                    : `${SUPABASE_URL}/rest/v1/tickers`;

                await fetch(url, {
                    method,
                    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
                    body: JSON.stringify({ username, tickers: tickers || [], updated_at: new Date().toISOString() }),
                });
            }
        } catch (err) {
            console.error('sync POST error:', err.message);
            // Don't fail the client — tickers saved locally, sync best-effort
        }
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

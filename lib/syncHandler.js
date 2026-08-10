/**
 * HTTP handler for /api/sync.
 *
 * Errors are reported, never swallowed. A failed read must not look like an empty
 * portfolio and a failed write must not report success — that is what made the
 * dead-backend outage invisible.
 */

const { SyncError, normalizeUsername, loadTickers, saveTickers } = require('./supabaseSync');

function fail(res, err, context) {
    const isSync = err instanceof SyncError;
    const status = isSync ? err.status : 500;
    const code = isSync ? err.code : 'sync_error';

    console.error(`[sync] ${context} failed (${code}):`, err.message, isSync && err.detail ? `— ${err.detail}` : '');

    return res.status(status).json({
        error: code,
        message: err.message,
        ...(isSync && err.detail ? { detail: err.detail } : {}),
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    const body = req.body || {};
    const username = normalizeUsername(req.method === 'GET' ? req.query.username : body.username);

    if (!username) {
        return res.status(400).json({
            error: 'invalid_username',
            message: 'Username must be 2–20 characters: lowercase letters, numbers, _ or -.',
        });
    }

    if (req.method === 'GET') {
        try {
            return res.status(200).json(await loadTickers(username));
        } catch (err) {
            return fail(res, err, 'read');
        }
    }

    const { tickers } = body;
    if (!Array.isArray(tickers)) {
        return res.status(400).json({ error: 'invalid_tickers', message: 'tickers must be an array.' });
    }

    const clean = tickers.filter(t => typeof t === 'string').map(t => t.trim().toUpperCase()).filter(Boolean);

    try {
        const { updatedAt } = await saveTickers(username, clean);
        return res.status(200).json({ success: true, tickers: clean, updatedAt });
    } catch (err) {
        return fail(res, err, 'write');
    }
};

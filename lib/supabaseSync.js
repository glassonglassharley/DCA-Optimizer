/**
 * Supabase sync for the username-keyed ticker store.
 *
 * Shared by pages/api/sync.js and api/sync.js so the two entry points can never
 * drift apart again. Configuration comes from the environment — the project ref
 * and anon key must never be hardcoded here.
 *
 * Required env vars:
 *   SUPABASE_URL       e.g. https://<project-ref>.supabase.co
 *   SUPABASE_ANON_KEY  the public anon key (safe for the server to hold)
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || '').trim();
const TABLE = 'tickers';

// Same rule the sign-in input enforces client-side. Applied again here so a
// hand-crafted request can't create a row under a key the app can never read back.
const USERNAME_RE = /^[a-z0-9_-]{2,20}$/;

class SyncError extends Error {
    constructor(message, { status = 502, code = 'sync_failed', detail = null } = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.detail = detail;
    }
}

function isConfigured() {
    return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function assertConfigured() {
    if (!isConfigured()) {
        throw new SyncError(
            'Sync backend is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
            { status: 503, code: 'sync_unconfigured' }
        );
    }
}

/** Normalize to the canonical storage key, or return null if unusable. */
function normalizeUsername(raw) {
    if (typeof raw !== 'string') return null;
    const clean = raw.trim().toLowerCase();
    return USERNAME_RE.test(clean) ? clean : null;
}

function authHeaders() {
    return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
}

async function readBody(res) {
    try {
        const text = await res.text();
        return text ? text.slice(0, 500) : null;
    } catch {
        return null;
    }
}

/** Wrap fetch so DNS/TLS/socket failures surface as a distinct 503, not a generic 502. */
async function call(url, init) {
    try {
        return await fetch(url, init);
    } catch (err) {
        throw new SyncError(`Cannot reach Supabase at ${SUPABASE_URL}`, {
            status: 503,
            code: 'sync_unreachable',
            detail: err && err.message ? err.message : String(err),
        });
    }
}

/**
 * Read a user's ticker list.
 * `found` distinguishes "row exists and is empty" from "no row yet" — the caller
 * needs that to decide whether an empty result should overwrite local data.
 */
async function loadTickers(username) {
    assertConfigured();

    // order+limit make the result deterministic; the old query took data[0] from an
    // unordered set, which returns an arbitrary row if duplicates ever exist.
    const url =
        `${SUPABASE_URL}/rest/v1/${TABLE}` +
        `?username=eq.${encodeURIComponent(username)}` +
        `&select=tickers,updated_at&order=updated_at.desc&limit=1`;

    const res = await call(url, { headers: authHeaders() });

    if (!res.ok) {
        throw new SyncError(`Supabase rejected the read (HTTP ${res.status})`, {
            status: 502,
            code: 'sync_read_rejected',
            detail: await readBody(res),
        });
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        return {
            tickers: Array.isArray(row.tickers) ? row.tickers.filter(t => typeof t === 'string') : [],
            updatedAt: row.updated_at || null,
            found: true,
        };
    }
    return { tickers: [], updatedAt: null, found: false };
}

/**
 * Upsert a user's ticker list.
 * Relies on the UNIQUE constraint on tickers.username from supabase-schema.sql;
 * on_conflict tells PostgREST which constraint to merge against. If the constraint
 * is missing this throws with Postgres error 42P10 rather than silently diverging.
 */
async function saveTickers(username, tickers) {
    assertConfigured();

    const updatedAt = new Date().toISOString();
    const res = await call(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=username`, {
        method: 'POST',
        headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ username, tickers, updated_at: updatedAt }),
    });

    if (!res.ok) {
        const detail = await readBody(res);
        const hint = detail && detail.includes('42P10')
            ? ' Run supabase-schema.sql — the UNIQUE constraint on tickers.username is missing.'
            : '';
        throw new SyncError(`Supabase rejected the write (HTTP ${res.status}).${hint}`, {
            status: 502,
            code: 'sync_write_rejected',
            detail,
        });
    }

    return { updatedAt };
}

module.exports = {
    SyncError,
    isConfigured,
    normalizeUsername,
    loadTickers,
    saveTickers,
};

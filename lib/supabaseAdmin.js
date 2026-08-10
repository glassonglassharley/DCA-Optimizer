/**
 * Server-only Supabase access using the service_role key.
 *
 * service_role bypasses RLS, so this module must never be imported from client
 * code. Authorization is enforced upstream: every caller passes a clerkUserId
 * that came from getAuth(req), which the browser cannot forge.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (Project Settings → Data API → service_role)
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

class DbError extends Error {
    constructor(message, { status = 502, code = 'db_error', detail = null } = {}) {
        super(message);
        this.status = status;
        this.code = code;
        this.detail = detail;
    }
}

function isConfigured() {
    return Boolean(SUPABASE_URL && SERVICE_KEY);
}

function assertConfigured() {
    if (!isConfigured()) {
        throw new DbError(
            'Database is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
            { status: 503, code: 'db_unconfigured' }
        );
    }
}

function headers(extra = {}) {
    return {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        ...extra,
    };
}

async function readBody(res) {
    try {
        const text = await res.text();
        return text ? text.slice(0, 500) : null;
    } catch {
        return null;
    }
}

/**
 * Thin PostgREST wrapper. `path` is everything after /rest/v1/.
 * Network failures surface as 503 so they stay distinguishable from rejections.
 */
async function rest(path, { method = 'GET', body, prefer } = {}) {
    assertConfigured();

    let res;
    try {
        res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
            method,
            headers: headers(prefer ? { Prefer: prefer } : {}),
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
    } catch (err) {
        throw new DbError(`Cannot reach Supabase at ${SUPABASE_URL}`, {
            status: 503,
            code: 'db_unreachable',
            detail: err && err.message ? err.message : String(err),
        });
    }

    if (!res.ok) {
        const detail = await readBody(res);
        const missingTable = res.status === 404 || (detail && detail.includes('42P01'));
        throw new DbError(
            missingTable
                ? 'Table not found — run supabase-portfolios.sql in the Supabase SQL editor first.'
                : `Supabase rejected the request (HTTP ${res.status})`,
            { status: missingTable ? 503 : 502, code: missingTable ? 'db_schema_missing' : 'db_rejected', detail }
        );
    }

    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

module.exports = { DbError, isConfigured, rest };

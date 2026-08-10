/**
 * Plaid client — SANDBOX ONLY, and deliberately stateless.
 *
 * This module exists to support an experimental read-only holdings preview.
 * Two rules define it:
 *
 *   1. Sandbox only. assertSandbox() throws unless PLAID_ENV === 'sandbox', so
 *      a mis-set env var fails loudly instead of quietly talking to real
 *      accounts with real money behind them.
 *   2. Nothing is persisted. There is no store here on purpose — no table, no
 *      cache, no file. An access_token exists only as a local variable inside
 *      one request handler and goes out of scope when that handler returns.
 *
 * Required env (server-only, never NEXT_PUBLIC_):
 *   PLAID_CLIENT_ID
 *   PLAID_SECRET
 *   PLAID_ENV        must be the literal string "sandbox"
 */

const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const CLIENT_ID = (process.env.PLAID_CLIENT_ID || '').trim();
const SECRET = (process.env.PLAID_SECRET || '').trim();
const ENV = (process.env.PLAID_ENV || '').trim().toLowerCase();

class PlaidConfigError extends Error {
    constructor(message, code = 'plaid_unconfigured', status = 503) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

function isConfigured() {
    return Boolean(CLIENT_ID && SECRET && ENV);
}

/**
 * Whether the connect flow would actually succeed — the only honest gate for
 * showing a connect button.
 *
 * isConfigured() is not enough on its own: with PLAID_ENV=production the three
 * vars are all present, but assertSandbox() rejects the request, so a button
 * gated on isConfigured() alone would render and then fail on every click.
 * This mirrors assertSandbox()'s conditions so the UI and the server agree.
 */
function isPlaidReady() {
    return isConfigured() && ENV === 'sandbox';
}

/**
 * Refuses to run anywhere but sandbox. This is the guard that keeps an
 * experimental feature from ever reaching a real brokerage account.
 */
function assertSandbox() {
    if (!isConfigured()) {
        throw new PlaidConfigError(
            'Plaid is not configured. Set PLAID_CLIENT_ID, PLAID_SECRET and PLAID_ENV=sandbox.'
        );
    }
    if (ENV !== 'sandbox') {
        throw new PlaidConfigError(
            `Refusing to run: PLAID_ENV is "${ENV}". This integration is sandbox-only.`,
            'plaid_not_sandbox',
            400
        );
    }
}

let cached = null;

/** Sandbox basePath is hardcoded — the env var selects nothing but sandbox. */
function plaidClient() {
    assertSandbox();
    if (cached) return cached;
    cached = new PlaidApi(new Configuration({
        basePath: PlaidEnvironments.sandbox,
        baseOptions: {
            headers: {
                'PLAID-CLIENT-ID': CLIENT_ID,
                'PLAID-SECRET': SECRET,
            },
        },
    }));
    return cached;
}

/** Plaid errors carry useful detail in response.data; surface it without secrets. */
function plaidErrorPayload(err) {
    const d = err && err.response && err.response.data;
    if (d) {
        return {
            error: 'plaid_error',
            message: d.error_message || 'Plaid request failed.',
            plaidErrorCode: d.error_code || null,
            plaidErrorType: d.error_type || null,
        };
    }
    if (err instanceof PlaidConfigError) {
        return { error: err.code, message: err.message };
    }
    return { error: 'plaid_error', message: (err && err.message) || 'Plaid request failed.' };
}

function plaidErrorStatus(err) {
    if (err instanceof PlaidConfigError) return err.status;
    const s = err && err.response && err.response.status;
    return typeof s === 'number' ? s : 502;
}

module.exports = { plaidClient, assertSandbox, isConfigured, isPlaidReady, PlaidConfigError, plaidErrorPayload, plaidErrorStatus, PLAID_ENV: ENV };

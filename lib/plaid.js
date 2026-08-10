/**
 * Plaid client — owner-gated, and deliberately stateless.
 *
 * Two rules define it:
 *
 *   1. Owner only. Every route that reaches this module is behind
 *      requireOwner() in lib/apiAuth.js. That gate — not the environment — is
 *      what keeps this away from other users, which is why running against
 *      production is now allowed: the owner is connecting their own account.
 *      A mis-set PLAID_ENV still fails loudly rather than guessing.
 *   2. Nothing is persisted. There is no store here on purpose — no table, no
 *      cache, no file. An access_token exists only as a local variable inside
 *      one request handler and goes out of scope when that handler returns.
 *
 * Required env (server-only, never NEXT_PUBLIC_):
 *   PLAID_CLIENT_ID
 *   PLAID_SECRET
 *   PLAID_ENV        "sandbox" or "production" — selects the API host
 *   OWNER_USER_ID    read in lib/apiAuth.js; without it every route 403s
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

/** PLAID_ENV must name a host the SDK actually knows: sandbox or production. */
function isSupportedEnv() {
    return Object.prototype.hasOwnProperty.call(PlaidEnvironments, ENV);
}

/**
 * Whether the connect flow would actually succeed — the only honest gate for
 * showing a connect button.
 *
 * isConfigured() is not enough on its own: PLAID_ENV could be set to something
 * the SDK has no host for, and a button gated on isConfigured() alone would
 * render and then fail on every click. This mirrors assertPlaidReady()'s
 * conditions so the UI and the server agree. Note this says nothing about WHO
 * may use it — callers must combine it with isOwner().
 */
function isPlaidReady() {
    return isConfigured() && isSupportedEnv();
}

/**
 * Refuses to run against an environment the SDK cannot address.
 *
 * This used to pin the integration to sandbox, back when any signed-in user
 * could reach it. Authorization now lives in requireOwner(), so the remaining
 * job here is to reject a mis-set PLAID_ENV loudly instead of defaulting to a
 * host the operator did not choose.
 */
function assertPlaidReady() {
    if (!isConfigured()) {
        throw new PlaidConfigError(
            'Plaid is not configured. Set PLAID_CLIENT_ID, PLAID_SECRET and PLAID_ENV.'
        );
    }
    if (!isSupportedEnv()) {
        throw new PlaidConfigError(
            `Refusing to run: PLAID_ENV is "${ENV}". Expected one of: ${Object.keys(PlaidEnvironments).join(', ')}.`,
            'plaid_bad_env',
            400
        );
    }
}

let cached = null;

/** basePath follows PLAID_ENV — sandbox and production are both reachable. */
function plaidClient() {
    assertPlaidReady();
    if (cached) return cached;
    cached = new PlaidApi(new Configuration({
        basePath: PlaidEnvironments[ENV],
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

module.exports = {
    plaidClient,
    assertPlaidReady,
    isConfigured,
    isPlaidReady,
    PlaidConfigError,
    plaidErrorPayload,
    plaidErrorStatus,
    PLAID_ENV: ENV,
    IS_SANDBOX: ENV === 'sandbox',
};

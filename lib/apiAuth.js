/**
 * Shared plumbing for the Clerk-protected API routes.
 *
 * requireUser() is the single place identity is established. Routes must use its
 * return value and never trust a user id from the request body or query.
 */

const { getAuth } = require('@clerk/nextjs/server');
const { DbError } = require('./supabaseAdmin');

/** Returns the verified Clerk user id, or null after sending a 401. */
function requireUser(req, res) {
    const { userId } = getAuth(req);
    if (!userId) {
        res.status(401).json({ error: 'unauthorized', message: 'Sign in to continue.' });
        return null;
    }
    return userId;
}

/**
 * Whether a verified user id is the deployment owner.
 *
 * Fails closed on purpose. The empty-owner check runs BEFORE the comparison, so
 * an unset or blank OWNER_USER_ID rejects everyone rather than letting two
 * absent values match. Never call this with an id that did not come from
 * requireUser() — a body- or query-supplied id would defeat the whole gate.
 */
function isOwner(userId) {
    const owner = (process.env.OWNER_USER_ID || '').trim();
    if (!owner) return false;
    return typeof userId === 'string' && userId === owner;
}

/**
 * Returns the verified Clerk user id only if it is the owner's, else null after
 * sending 401 (not signed in) or 403 (signed in, not the owner).
 *
 * Same contract as requireUser: routes must check for null and return.
 */
function requireOwner(req, res) {
    const userId = requireUser(req, res);
    if (!userId) return null;

    if (!isOwner(userId)) {
        res.status(403).json({
            error: 'forbidden',
            message: 'This feature is limited to the account owner.',
        });
        return null;
    }
    return userId;
}

function fail(res, err, context) {
    const known = err instanceof DbError;
    const status = known ? err.status : 500;
    const code = known ? err.code : 'server_error';

    console.error(`[${context}] ${code}:`, err.message, known && err.detail ? `— ${err.detail}` : '');

    return res.status(status).json({
        error: code,
        message: err.message,
        ...(known && err.detail ? { detail: err.detail } : {}),
    });
}

function methodNotAllowed(res, allowed) {
    res.setHeader('Allow', allowed.join(', '));
    return res.status(405).json({ error: 'method_not_allowed' });
}

module.exports = { requireUser, isOwner, requireOwner, fail, methodNotAllowed };

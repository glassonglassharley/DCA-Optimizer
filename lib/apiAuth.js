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

module.exports = { requireUser, fail, methodNotAllowed };

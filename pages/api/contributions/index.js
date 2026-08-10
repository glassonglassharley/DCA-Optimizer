/**
 * GET  /api/contributions — the signed-in user's logged contributions.
 * POST /api/contributions — log one contribution.
 *
 * Signed-in-gated, not owner-gated: contribution history is ordinary per-user
 * data like portfolios, unlike the Plaid routes which touch one brokerage.
 * Identity comes from requireUser() and nothing reads a user id off the body.
 */

import { listContributions, createContribution } from '../../../lib/contributions';
import { requireUser, fail, methodNotAllowed } from '../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method === 'GET') {
        try {
            return res.status(200).json({ contributions: await listContributions(userId) });
        } catch (err) {
            return fail(res, err, 'contributions:list');
        }
    }

    if (req.method === 'POST') {
        const { portfolioId, loggedAt, note, items } = req.body || {};
        try {
            const contribution = await createContribution(userId, { portfolioId, loggedAt, note, items });
            return res.status(201).json({ contribution });
        } catch (err) {
            return fail(res, err, 'contributions:create');
        }
    }

    return methodNotAllowed(res, ['GET', 'POST']);
}

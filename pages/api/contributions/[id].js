/**
 * DELETE /api/contributions/[id] — remove one logged contribution.
 *
 * A contribution is never edited in place, because the average cost basis shown
 * in history is derived from the price snapshot taken when it was logged;
 * rewriting an entry would silently restate that average. A correction is a
 * delete followed by a new entry.
 *
 * deleteContribution() re-checks ownership against clerk_user_id before removing
 * anything, so an id belonging to another user 404s rather than deleting.
 */

import { deleteContribution } from '../../../lib/contributions';
import { requireUser, fail, methodNotAllowed } from '../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);

    const { id } = req.query;
    if (typeof id !== 'string' || !id.trim()) {
        return res.status(400).json({ error: 'invalid_id', message: 'A contribution id is required.' });
    }

    try {
        return res.status(200).json(await deleteContribution(userId, id.trim()));
    } catch (err) {
        return fail(res, err, 'contributions:delete');
    }
}

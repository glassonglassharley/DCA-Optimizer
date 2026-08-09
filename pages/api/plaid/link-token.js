/**
 * POST /api/plaid/link-token — sandbox Link token for the signed-in Clerk user.
 *
 * Returns only the short-lived link_token, which is what Plaid Link needs in the
 * browser. No access_token exists at this stage, and nothing is written anywhere.
 */

import { plaidClient, plaidErrorPayload, plaidErrorStatus } from '../../../lib/plaid';
import { requireUser, methodNotAllowed } from '../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    try {
        // client_user_id ties the Link session to the Clerk user, so one user's
        // session can never be used to pull another's holdings.
        const r = await plaidClient().linkTokenCreate({
            user: { client_user_id: userId },
            client_name: 'DCA Anchor (sandbox)',
            products: ['investments'],
            country_codes: ['US'],
            language: 'en',
        });

        return res.status(200).json({
            link_token: r.data.link_token,
            expiration: r.data.expiration || null,
            sandbox: true,
        });
    } catch (err) {
        console.error('[plaid:link-token]', err && err.message);
        return res.status(plaidErrorStatus(err)).json(plaidErrorPayload(err));
    }
}

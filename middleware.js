import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Clerk runs on the private API routes only — never on a page.
 *
 * The homepage is guest-first: a signed-out visitor gets a localStorage-backed
 * watchlist and writes nothing to the server. Running clerkMiddleware on "/"
 * put every anonymous page load through the session handshake, which is what
 * produced the "infinite redirect loop" on localhost. Keeping pages out of the
 * matcher removes the handshake from page loads entirely, so guests just render.
 *
 * The matcher below must list every route that calls getAuth() — outside these
 * paths getAuth() has no middleware to read from and throws.
 */
const isProtectedApiRoute = createRouteMatcher([
    '/api/portfolios(.*)',
    '/api/sync(.*)',
    '/api/plaid(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
    if (!isProtectedApiRoute(req)) return;

    // Deliberately not auth.protect(): on a non-document request it answers 404,
    // which would replace the 401 JSON contract that lib/apiAuth.js established
    // and the client's error handling reads. This is defense in depth for routes
    // that forget requireUser(), and it speaks the same shape those routes do.
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json(
            { error: 'unauthorized', message: 'Sign in to continue.' },
            { status: 401 },
        );
    }
});

export const config = {
    matcher: [
        '/api/portfolios(.*)',
        '/api/sync(.*)',
        '/api/plaid(.*)',
    ],
};

import { clerkMiddleware } from '@clerk/nextjs/server';

// clerkMiddleware only attaches the session to the request — it does not protect
// anything on its own. Authorization lives in each API route via getAuth(req),
// so a rejected call returns clean 401 JSON instead of an HTML redirect.
export default clerkMiddleware();

export const config = {
    matcher: [
        // Everything except Next internals and static files.
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|txt|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};

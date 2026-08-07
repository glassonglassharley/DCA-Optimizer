// Both this route and api/sync.js delegate to one implementation. Which of the two
// Vercel serves depends on build config; sharing the module makes that irrelevant.
import handler from '../../lib/syncHandler';

export default handler;

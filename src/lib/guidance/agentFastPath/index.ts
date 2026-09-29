/**
 * Deterministic, zero-latency answers for the questions elders ask most.
 *
 * This used to live inline in `POST /api/v1/agent/ask`, ~250 lines deep inside
 * the request handler, where it could not be exercised without a device token,
 * a database and Redis. It is a pure function of (app, question, on-screen
 * elements), so it lives here and the route just calls it.
 *
 * The rule chain is deliberately unchanged by that move: it is the ground truth
 * for the most common elderly flows, and the tests in
 * `agentFastPath.test.ts` pin its behaviour.
 *
 * Copy lives in one bilingual table rather than a translation lookup, so the
 * compiler refuses a rule that only has a Hindi sentence. That is what keeps an
 * English-speaking elder from hearing Hinglish out of the fastest path.
 *
 * The module is now a folder: the bilingual table lives in `copy.ts` and the
 * rule chain that reads it in `matching.ts`. This file is the entry point and
 * keeps the public surface unchanged.
 */

export { matchFastPathRule } from './matching';
export type { FastPathMatch } from './matching';

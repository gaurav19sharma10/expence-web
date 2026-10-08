/**
 * A human-readable stamp of what is deployed.
 *
 * Exists because "the site looks unchanged" is not a question anybody can answer
 * by looking at a screenshot, and every deployment conversation otherwise turns
 * into a debate about caches. This is shown at the bottom of Settings: if it does
 * not read `web-2026-10-07.7`, the browser is serving an older build and the
 * question is answered rather than argued.
 *
 * Bump it whenever something user-visible ships.
 */
export const BUILD_STAMP = 'web-2026-10-07.7';

/** What the stamp says about itself, for the footer line. */
export function buildLine(): string {
  return `Build ${BUILD_STAMP}`;
}

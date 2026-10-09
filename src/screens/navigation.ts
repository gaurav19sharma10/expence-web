/**
 * The set of top-level destinations.
 *
 * Exported from its own module because both the header and the bottom bar need
 * it, and because the shell uses it as state. Keeping it here means the desktop
 * and mobile navigation cannot drift into offering different destinations.
 */
export type Screen =
  | 'home'
  | 'history'
  | 'insights'
  | 'members'
  | 'wallets'
  | 'goals'
  | 'limits'
  | 'settings'
  | 'profile';
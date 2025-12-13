/**
 * Cookie notice accepted.
 */
export const COOKIE_ACCEPTED = 'accepted';

/**
 * Cookie notice rejected.
 */
export const COOKIE_REJECTED = 'rejected';

/**
 * Cookie notice not yet set.
 */
export const COOKIE_UNSET = 'unset';


/**
 * Get the current cookie consent state.
 * @returns The consent state.
 */
export function getCookieConsent() {
  return localStorage.getItem('cookie-decision') ?? COOKIE_UNSET;
}


/**
 * Set the current cookie state.
 * @param val The cookie state to set.
 */
export function setCookieConsent(val) {
  localStorage.setItem('cookie-decision', val);
}

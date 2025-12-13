/**
 * Automatically-adapting theme.
 */
export const THEME_AUTO = 'auto';

/**
 * Light theme.
 */
export const THEME_LIGHT = 'light';

/**
 * Dark theme.
 */
export const THEME_DARK = 'dark';


/**
 * Change the theme.
 * @param theme The theme to use.
 */
export function changeTheme(theme) {
  localStorage.setItem('theme', theme);
  const data = document.documentElement.dataset;

  /* Auto theme. */
  if (theme == THEME_AUTO) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? THEME_DARK : THEME_LIGHT;
  }

  /* Update the page theme. */
  data.theme = theme;
}


/**
 * Get the current theme.
 * @returns The current theme.
 */
export function getCurrTheme() {
  return localStorage.getItem('theme') || THEME_AUTO;
}


/* Initialize the theme. */
changeTheme(getCurrTheme());

/* Auto theme updates. */
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    if (getCurrTheme() == THEME_AUTO)
      changeTheme(THEME_AUTO);
  });

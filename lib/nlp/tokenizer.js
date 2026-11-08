/**
 * Splits a text into tokens.
 * @param text The source text to work with.
 * @returns Array of token strings.
 */
export function tokenize(text) {
  return text.trim().split(/\s+/g);
}

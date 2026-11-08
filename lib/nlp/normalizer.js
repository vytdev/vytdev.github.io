/**
 * Perform unicode normalization, remove diacritics and other
 * marks, and convert the text into lowercase.
 * @param text The source text string.
 * @returns The normalized text.
 */
export function normalizeText(text) {
  return text.normalize('NFKD')
      .replace(/\p{M}+/gu, '')
      .toLowerCase();
}

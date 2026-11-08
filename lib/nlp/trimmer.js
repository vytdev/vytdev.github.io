/**
 * Trims the start and end of a word.
 * @param word The word to trim.
 * @returns Trimmed word.
 */
export function trimWord(word) {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

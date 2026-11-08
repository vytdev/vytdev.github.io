/* Basic search-safe stopwords. */
export const basicStopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'by',
    'for', 'with', 'of', 'to', 'from', 'up', 'down', 'over', 'under',
    'between', 'so', 'very', 'as', 'than',
  ]);


/**
 * Returns true whether a word is a stopword.
 * @param word The word.
 * @returns Whether the word is a stop word.
 */
export function isAStopWord(word) {
  return basicStopwords.has(word);
}

import EnglishStemmer from './stemmers/english-stemmer.js';
export { EnglishStemmer };

/* Stemmer instance for stemWord(). */
const stemmer = new EnglishStemmer();

/**
 * Applies stemming to a word using Porter2 stemmer.
 * @param word The (derivative) word to stem.
 * @returns The (kinda) irreducible root of the word.
 */
export function stemWord(word) {
  return stemmer.stem(word);
}

const stemmer = require('./nlp-stemmer.js');


/* Split separators. */
const punctuation = /[\s~`’‘“”|^°{}[\]()<>\\%@#$&\-+=*/"':;!?.,]+/u;

/* Basic search-safe stopwords. */
const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'by',
    'for', 'with', 'of', 'to', 'from', 'up', 'down', 'over', 'under',
    'between', 'so', 'very', 'as', 'than',
  ]);


/**
 * Creates a contraction definition.
 * @param match The matching string. Could start or end with '-' to indicate
 * that it is allowed (or expected) to be near other letters.
 * @param replacement The string to substitute.
 * @returns A function that takes a raw text and returns a string.
 */
function makeContr(match, replacement) {
  if (!match.startsWith('-')) {
    match = '(?<p1>' + punctuation.source + '|^)' + match;
    replacement = '$<p1>' + replacement;
  } else match = match.slice(1);

  if (!match.endsWith('-')) {
    match += '(?<p2>' + punctuation.source + '|$)';
    replacement += '$<p2>';
  } else match = match.slice(0, -1);

  const regex = new RegExp(match, 'giu');
  return (text) => text.replace(regex, replacement);
}


/* Define contractions. Applied before splitting. */
const contractions = [
    makeContr(`can't`,    'can not'),
    makeContr(`-n't`,     ' not'),
    makeContr(`-'ll`,     ' will'),
    makeContr(`-'re`,     ' are'),
    makeContr(`-'ve`,     ' have'),
    makeContr(`-'m`,      ' am'),
    makeContr(`-'s`,      ' is'),  /* might be a possessive. */
    makeContr(`-'d`,      ' had'), /* or 'would' */
    makeContr(`cannot`,   'can not'),
    makeContr(`gonna`,    'going to'),
    makeContr(`wanna`,    'want to'),
  ];


/**
 * Normalizes a string.
 * @param str The string to normalize.
 * @returns The normalized string.
 */
function normalize(str) {
  return str.normalize('NFKD')          /* allow single jamo search */
    .replace(/[\u0300-\u036f]/g, '')    /* remove the accents */
    .toLowerCase();                     /* for case insensitive search */
}


/**
 * Expand contractions on a text.
 * @param text The text that contains contractions.
 * @returns A new string with no contractions.
 */
function expandContractions(text) {
  contractions.forEach(v => text = v(text));
  return text;
}


/**
 * Split a string by punctuations into tokens.
 * @param text The string to split.
 * @returns An array of strings (tokens).
 */
function tokenize(text) {
  return text.split(punctuation).filter(v => v.length > 0);
}


/**
 * Returns whether the given string is a stopword.
 * @param token The token string to check.
 * @returns True if it is a stopword, false otherwise.
 */
function isStopword(token) {
  return stopwords.has(token);
}


/**
 * Normalize, expand contractions, and split text into tokens. This does not
 * filter out stopwords and stem the tokens.
 * @param str The raw text.
 * @returns An array of unstemmed tokens, with stopwords.
 */
function split(str) {
  str = normalize(str);
  str = expandContractions(str);
  return tokenize(str);
}


/**
 * Performs all the natural language processing above to come up with a list
 * of atomic tokens, for which can be safely used for the search.
 * @param str The raw text.
 * @returns An array of stemmed tokens, without stopwords.
 */
function preprocess(str) {
  return split(str)
      .filter(v => !isStopword(v))
      .map(stemmer);
}


exports = module.exports = {
  stemmer,
  punctuation,
  stopwords,
  makeContr,
  contractions,
  normalize,
  expandContractions,
  tokenize,
  isStopword,
  split,
  preprocess,
};

const stemmer = require('./porter-stemmer.js');
const stopwords = require('./stopwords.js');

/*
 * Punctuations as separators.
 */
const punctuation = /[\s~`’‘|^°{}[\]()<>\\%@#$&\-+=*/"':;!?.,]+/;

/*
 * For expanding quoted contractions.
 */
const quotedContractions = [
    [/can't([ ,:;.!?]|$)/gi, 'can not '],
    [/n't([ ,:;.!?]|$)/gi, ' not '],
    [/'ll([ ,:;.!?]|$)/gi, ' will '],
    [/'s([ ,:;.!?]|$)/gi, ' is '],
    [/'re([ ,:;.!?]|$)/gi, ' are '],
    [/'ve([ ,:;.!?]|$)/gi, ' have '],
    [/'m([ ,:;.!?]|$)/gi, ' am '],
    [/'d([ ,:;.!?]|$)/gi, ' had ']
  ];

/*
 * For expanding unquoted contractions.
 */
const unquotedContractions = {
    cannot: ['can', 'not'],
    gonna: ['going', 'to'],
    wanna: ['want', 'to']
  };


/**
 * Normalizes a string.
 * @param str The string to normalize.
 * @returns The normalized string.
 */
function normalize(str) {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};


/**
 * Tokenizes a string.
 * @param str The string to tokenize.
 * @returns An array of tokens.
 */
function tokenize(str) {
  /* Expand quoted contractions. */
  for (let i = 0; i < quotedContractions.length; i++) {
    str = str.replace(
      quotedContractions[i][0],
      quotedContractions[i][1]);
  }

  let tokens = [];

  /* Split by punctuations. */
  str.split(punctuation)

  /* Expand unquoted contractions. */
    .forEach(word => {
      if (word in unquotedContractions)
        tokens = tokens.concat(unquotedContractions[word]);
      else
        tokens.push(word);
    });

  return tokens.filter(v => v.length > 0);
};


/**
 * Extract tokens from a given string.
 * @param str The source string.
 * @returns An array of tokens.
 */
function split(str) {
  return tokenize(normalize(str));
};


/**
 * Returns whether word is a stopword.
 * @param word The word to check.
 * @returns True if the word is a stopword.
 */
function isStopword(word) {
  return stopwords.includes(word);
}


/**
 * Process a string.
 * @param str The string to process.
 * @returns An array of stemmed words with stopwords removed.
 */
function processText(str) {
  return split(str)
    .filter(v => !isStopword(v))
    .map(stemmer);
}


exports = module.exports = {
  stemmer,
  stopwords,
  punctuation,
  quotedContractions,
  unquotedContractions,
  normalize,
  tokenize,
  split,
  isStopword,
  processText,
};

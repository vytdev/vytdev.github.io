/**
 * Creates a contraction expansion function.
 * @param match The regex string to match the desired text. Can include
 * a '-' prefix/suffkx to indicate whether to allow the match be beside
 * linguistic characters.
 * @param replacement The replacement string/function.
 * @returns ((text) => expanded)
 */
export function expandDef(match, replacement) {
  /* before match */
  if (!match.startsWith('-'))
    match = `(?<![\\p{L}\\p{N}])` + match;
  else
    match = match.slice(1);

  /* after match */
  if (!match.endsWith('-'))
    match = match + `(?![\\p{L}\\p{N}])`;
  else
    match = match.slice(0, -1);

  const regex = new RegExp(match, 'giu');
  return (text) => text.replace(regex, replacement);
}


/* Define contractions. Applied before splitting. Can be appended
   directly into the pipeline. */
export const defaultContractions = [
    expandDef(`can't`,    'can not'),
    expandDef(`-n't`,     ' not'),
    expandDef(`-'ll`,     ' will'),
    expandDef(`-'re`,     ' are'),
    expandDef(`-'ve`,     ' have'),
    expandDef(`-'m`,      ' am'),
    expandDef(`-'s`,      ' is'),  /* might be a possessive. */
    expandDef(`-'d`,      ' had'), /* or 'would' */
    expandDef(`cannot`,   'can not'),
    expandDef(`gonna`,    'going to'),
    expandDef(`wanna`,    'want to'),
  ];


/**
 * Expand all the contractions from the given text.
 * @param text The source text to work with.
 * @param [defs] The contraction expansion definitions.
 * @returns The transformed text.
 */
export function expandContractions(text, defs=defaultContractions) {
  return defs.reduce((text, fn) => fn(text), text);
}

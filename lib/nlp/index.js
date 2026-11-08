import { normalizeText } from './normalizer.js';
import { expandContractions } from './contractions.js';
import { tokenize } from './tokenizer.js';
import { trimWord } from './trimmer.js';
import { isAStopWord } from './stopwords.js';
import { stemWord } from './stemmer.js';

export * from './normalizer.js';
export * from './contractions.js';
export * from './tokenizer.js';
export * from './trimmer.js';
export * from './stopwords.js';
export * from './stemmer.js';


/**
 * @class
 * A pipeline manager.
 */
export class Pipeline {

  /**
   * @constructor
   * @param [pipeline] Optional initial pipeline list.
   */
  constructor(pipeline) {
    this.pipeline = [];
    this._stepIDs = new Map();    /* Map<id, index> */
    if (Array.isArray(pipeline))
      this._splice(0, 0, ...pipeline);
  }

  /**
   * @private
   * Wraps splice on the pipeline array.
   * @param indx Starting index.
   * @param rmCount Remove count.
   * @param [steps] Steps to insert.
   */
  _splice(indx, rmCount, ...steps) {
    /* sanitize step */
    for (const [id, fn] of steps) {
      if (this._stepIDs.has(id))
        throw new Error('Step with ID already exists: ' + id);
      if (typeof fn !== 'function')
        throw new Error('Invalid step function for ID: ' + id);
      /* temporary; set to actual index later */
      this._stepIDs.set(id, null);
    }

    this.pipeline.splice(indx, rmCount, ...steps);

    /* have to rebuild _stepIDs after splicing, indices
       could've moved */
    this._stepIDs.clear();
    this.pipeline.forEach(([id], i) => this._stepIDs.set(id, i));
  }

  /**
   * Inserts a new step before the given reference step.
   * @param refId The identifier of the reference step.
   * @param id The identifier of the new step.
   * @param fn The transformation function.
   */
  insertBefore(refId, id, fn) {
    const refIdx = this._stepIDs.get(refId);
    if (typeof refIdx !== 'number')
      throw new Error('Cannot find reference: ' + refId);
    this._splice(refIdx, 0, [id, fn]);
  }

  /**
   * Inserts a new step after the given reference step.
   * @param refId The identifier of the reference step.
   * @param id The identifier of the new step.
   * @param fn The transformation function.
   */
  insertAfter(refId, id, fn) {
    const refIdx = this._stepIDs.get(refId);
    if (typeof refIdx !== 'number')
      throw new Error('Cannot find reference: ' + refId);
    this._splice(refIdx + 1, 0, [id, fn]);
  }

  /**
   * Inserts a new step at the beginning of the pipeline.
   * @param id The identifier of the new step.
   * @param fn The transformation function.
   */
  append(id, fn) {
    this._splice(this.pipeline.length, 0, [id, fn]);
  }

  /**
   * Inserts a new step at the end of the pipeline.
   * @param id The identifier of the new step.
   * @param fn The transformation function.
   */
  prepend(id, fn) {
    this._splice(0, 0, [id, fn]);
  }

  /**
   * Removes a step from the pipeline.
   * @param id The identifier of the step to remove.
   * @returns True if the step is removed successfully.
   */
  remove(id) {
    const refIdx = this._stepIDs.get(id);
    if (typeof refIdx !== 'number')
      return false;
    this._splice(refIdx, 1);
    this._stepIDs.delete(id);
    return true;
  }

  /**
   * Returns a list of all the identifiers of the steps that are
   * currently in the pipeline.
   * @returns List of identifiers, in pipeline order.
   */
  getStepsList() {
    return this.pipeline.map(([id,]) => id);
  }

  /**
   * Transforms an input by passing it through the pipeline. Stops
   * immediately on undefined.
   * @param input The input to transform.
   * @param [startId] Which step to start at.
   * @returns The transformed output.
   */
  transform(input, startId) {
    let indx = typeof startId === 'string'
        ? this._stepIDs.get(startId) : 0;
    if (typeof indx !== 'number')
      throw new Error('Step does not exist on the pipeline: ' + startId);

    let acc = input;
    for ( ; indx < this.pipeline.length; indx++) {
      if (typeof acc === 'undefined')
        break;
      const [id, fn] = this.pipeline[indx];
      acc = fn(acc, id);
    }

    return acc;
  }
}


/* Default text processing pipeline. */
export const preTokenPipeline = new Pipeline([
  ['normalize',    v => normalizeText(v)],
  ['contractions', v => expandContractions(v)],
  ['tokenize',     v => tokenize(v)],
]);

/* Default pipeline applied on individual tokens. */
export const postTokenPipeline = new Pipeline([
  ['trimmer',      v => trimWord(v)],
  ['stopwords',    v => isAStopWord(v) ? undefined : v],
  ['stemmer',      v => stemWord(v)],
]);


/**
 * Transform a text into stemmed tokens, using the default
 * pipelines.
 * @param text The text to transform.
 * @returms Stemmed tokens.
 */
export function preprocessText(text) {
  const tokens = preTokenPipeline.transform(text);
  const finalTokens = [];
  tokens.forEach(tok => {
    const transformedTok = postTokenPipeline.transform(tok);
    if (typeof transformedTok === 'string')
      finalTokens.push(transformedTok);
  });
  return finalTokens;
}

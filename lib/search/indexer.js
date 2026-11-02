import * as nlp from './nlp.js';

const UINT16_MAX = 65535;


/**
 * Tokenize a text.
 * @param text
 */
export function getIndexableTokens(text) {
  return nlp.preprocess(text);
}



class StringIndex {
  constructor() {
    this.strings = new Map(); /* strID => offset */
    this._currOffset = 0;
  }

  getString(str) {
    if (!this.strings.has(str)) {
      const length = Buffer.byteLength(str, 'utf-8');
      if (length > UINT16_MAX)
        throw new Error('String too big');
      this.strings.set(str, this._currOffset);
      this._currOffset += 2 + length;
    };
    return this.strings.get(str);
  }

  getBytesSize() {
    return this._currOffset;
  }

  compile() {
    const buf = Buffer.allocUnsafe(this.getBytesSize());
    for (const [str, pos] of this.strings.entries()) {
      const bytesLen = buf.write(str, pos + 2, 'utf-8');
      buf.writeUInt16(bytesLen, pos);
    }
    return buf;
  }
}

/**
 * @class
 * RawBuffer buffer wrapper implementation for browser.
 */
export class RawBuffer {

  /**
   * @param buf The ArrayBuffer.
   */
  constructor(buf) {
    this.origBuf = buf;
    this.dataView = new DataView(buf);
    this._uint8view = new Uint8Array(buf);
    this._encoder = new TextEncoder();
    this._decoder = new TextDecoder('utf-8', { fatal: false });
  }

  get size() {
    return this.origBuf.byteLength;
  }

  writeStr(str, off, len) {
    const target = this._uint8view.subarray(off, off + len);
    this._encoder.encodeInto(str, target);
  }

  readStr(off, len) {
    const slice = this._uint8view.subarray(off, off + len);
    return this._decoder.decode(slice);
  }

  wrU8(val, off) { this.dataView.setUint8(off, val); }
  wrU16(val, off) { this.dataView.setUint16(off, val, true); }
  wrU32(val, off) { this.dataView.setUint32(off, val, true); }

  wrI8(val, off) { this.dataView.setInt8(off, val); }
  wrI16(val, off) { this.dataView.setInt16(off, val, true); }
  wrI32(val, off) { this.dataView.setInt32(off, val, true); }

  wrF32(val, off) { this.dataView.setFloat32(off, val, true); }
  wrF64(val, off) { this.dataView.setFloat64(off, val, true); }

  rdU8(off) { return this.dataView.getUint8(off); }
  rdU16(off) { return this.dataView.getUint16(off, true); }
  rdU32(off) { return this.dataView.getUint32(off, true); }

  rdI8(off) { return this.dataView.getInt8(off); }
  rdI16(off) { return this.dataView.getInt16(off, true); }
  rdI32(off) { return this.dataView.getInt32(off, true); }

  rdF32(off) { return this.dataView.getFloat32(off, true); }
  rdF64(off) { return this.dataView.getFloat64(off, true); }

  static strByteLen(str) {
    return new TextEncoder().encode(str).length;
  }
}

/**
 * @class
 * RawBuffer buffer wrapper implementation for node.
 */
export class RawBuffer {

  /**
   * @param buf The Buffer.
   */
  constructor(buf) {
    this.origBuf = buf;
  }

  get size() {
    return this.origBuf.length;
  }

  writeStr(str, off, len) {
    this.origBuf.write(str, off, len, 'utf8');
  }

  readStr(off, len) {
    return this.origBuf.toString('utf8', off, off + len);
  }

  wrU8(val, off) { this.origBuf.writeUInt8(val, off); }
  wrU16(val, off) { this.origBuf.writeUInt16LE(val, off); }
  wrU32(val, off) { this.origBuf.writeUInt32LE(val, off); }

  wrI8(val, off) { this.origBuf.writeInt8(val, off); }
  wrI16(val, off) { this.origBuf.writeInt16LE(val, off); }
  wrI32(val, off) { this.origBuf.writeInt32LE(val, off); }

  wrF32(val, off) { this.origBuf.writeFloatLE(val, off); }
  wrF64(val, off) { this.origBuf.writeDoubleLE(val, off); }

  rdU8(off) { return this.origBuf.readUInt8(off); }
  rdU16(off) { return this.origBuf.readUInt16LE(off); }
  rdU32(off) { return this.origBuf.readUInt32LE(off); }

  rdI8(off) { return this.origBuf.readInt8(off); }
  rdI16(off) { return this.origBuf.readInt16LE(off); }
  rdI32(off) { return this.origBuf.readInt32LE(off); }

  rdF32(off) { return this.origBuf.readFloatLE(off); }
  rdF64(off) { return this.origBuf.readDoubleLE(off); }

  static strByteLen(str) {
    return Buffer.byteLength(str, 'utf8');
  }
}

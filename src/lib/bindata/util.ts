export const bufToUvarint64 = (buffer: Buffer): [number, Buffer] => {
  let x = 0;
  let s = 0;

  for (let i = 0; true; i++) {
      const byte = buffer[i];

      if (i > 9 || i == 9 && byte > 1) { throw new Error('uint64 overflow'); }

      if (byte < 0x80) {
        return [Number(BigInt(x) | BigInt(byte) << BigInt(s)), buffer.slice(i + 1)];
      }

      x |= (byte & 0x7F) << s;
      s += 7;
  }
};

export const uvarint64ToBuf = (uint: number): Buffer => {
  const result = [];

  while (uint >= 0x80) {
    result.push((uint & 0xFF) | 0x80);
    uint >>>= 7;
  }

  result.push(uint | 0);

  return new Buffer(result);
};

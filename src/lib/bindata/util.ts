export const bufToUvarint64 = (buffer: Buffer): [number, Buffer] => {
  let x = BigInt(0);
  let s = BigInt(0);

  for (let i = 0; true; i++) {
    const byte = buffer[i];

    if (i > 9 || (i == 9 && byte > 1)) {
      throw new Error('uint64 overflow');
    }

    if (byte < 0x80) {
      return [
        Number(BigInt(x) | (BigInt(byte) << BigInt(s))),
        buffer.slice(i + 1),
      ];
    }

    x |= BigInt(byte & 0x7f) << BigInt(s);
    s += BigInt(7);
  }
};

export const uvarint64ToBuf = (uint: number): Buffer => {
  const result = [];

  while (uint >= 0x80) {
    result.push(Number((BigInt(uint) & BigInt(0xff)) | BigInt(0x80)));
    uint = Number(BigInt(uint) >> BigInt(7));
  }

  result.push(uint | 0);

  return new Buffer(result);
};

export const uint64ToBufBigEndian = (uint: number): Buffer => {
  const result = [];

  while (BigInt(uint) >= BigInt(0xff)) {
    result.push(Number(BigInt(uint) & BigInt(0xff)));
    uint = Number(BigInt(uint) >> BigInt(8));
  }

  result.push(Number(BigInt(uint) | BigInt(0)));

  while (result.length < 8) {
    result.push(0);
  }

  return new Buffer(result.reverse());
};

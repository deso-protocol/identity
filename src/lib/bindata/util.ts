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

// TODO: Verify these are correct....
export const varint64ToBuf = (int: number): Buffer => {
  let ux = BigInt(int) << BigInt(1);
  if (int < 0) {
    ux = ~ux;
  }
  return uvarint64ToBuf(Number(ux));
};

export const bufToVarint64 = (buffer: Buffer): [number, Buffer] => {
  const [ux, n] = bufToUvarint64(buffer);
  let x = BigInt(ux) >> BigInt(1);
  if (ux & 1) {
    x = ~x;
  }
  return [Number(x), n];
};

import { bufToUvarint64, uvarint64ToBuf } from './util';

export interface Transcoder<T> {
  read: (bytes: Buffer) => [T, Buffer];
  write: (object: T) => Buffer;
}

export interface Serializable {
  toBytes: () => Buffer;
}

export interface Deserializable<T> {
  fromBytes: (bytes: Buffer) => [T, Buffer];
}

export const Uvarint64: Transcoder<number> = {
  read: (bytes) => bufToUvarint64(bytes),
  write: (uint) => uvarint64ToBuf(uint),
};

export const Boolean: Transcoder<boolean> = {
  read: (bytes) => [(bytes.readUInt8(0) != 0), bytes.slice(1)],
  write: (bool) => {
    const result = Buffer.alloc(1);
    result.writeUInt8(bool ? 1 : 0, 0);
    return result;
  },
};

export const Uint8: Transcoder<number> = {
  read: (bytes) => [bytes.readUInt8(0), bytes.slice(1)],
  write: (uint) => {
    const result = Buffer.alloc(1);
    result.writeUInt8(uint, 0);
    return result;
  },
};

export const FixedBuffer = (size: number): Transcoder<Buffer> => ({
  read: (bytes) => [bytes.slice(0, size), bytes.slice(size)],
  write: (bytes) => bytes,
});

export const VarBuffer: Transcoder<Buffer> = {
  read: (bytes) => {
    let [size, buffer] = bufToUvarint64(bytes);
    return [buffer.slice(0, size), buffer.slice(size)];
  },
  write: (bytes) => Buffer.concat([uvarint64ToBuf(bytes.length), bytes]),
};

export const ChunkBuffer = (width: number): Transcoder<Buffer[]> => ({
  read: (bytes) => {
    let [count, buffer] = bufToUvarint64(bytes);

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(buffer.slice(0, 33));
      buffer = buffer.slice(33);
    }

    return [result, buffer];
  },
  write: (chunks) => Buffer.concat([uvarint64ToBuf(chunks.length), ...chunks]),
});

export const ArrayOf = <T extends Serializable, C extends Deserializable<T> & ({ new(): T })>(klass: C): Transcoder<T[]> => ({
  read: (bytes) => {
    let [count, buffer] = bufToUvarint64(bytes);

    const result = [];
    for (let i = 0; i < count; i++) {
      let obj;
      [obj, buffer] = klass.fromBytes(buffer);
      result.push(obj);
    }

    return [result, buffer];
  },
  write: (objects) => {
    const count = uvarint64ToBuf(objects.length);
    return Buffer.concat([count, ...objects.map((object) => object.toBytes())]);
  },
});

export const Record = <T extends Serializable, C extends Deserializable<T> & ({ new(): T })>(klass: C): Transcoder<T> => ({
  read: (bytes) => klass.fromBytes(bytes),
  write: (object) => object.toBytes(),
});

export const Enum = <T extends Serializable, C extends Deserializable<T> & ({ new(): T })>(klassMap: {[index: string]: C}): Transcoder<T> => {
  const instanceToType = <T>(object: T): number => {
    for (let [key, value] of Object.entries(klassMap)) {
      if(object instanceof value) return parseInt(key);
    }
    return -1;
  };

  return ({
    read: (bytes) => {
      let buffer = bytes;
      let type;
      [type, buffer] = bufToUvarint64(buffer);
      let size
      [size, buffer] = bufToUvarint64(buffer);

      return [klassMap[type].fromBytes(buffer.slice(0, size))[0], buffer.slice(size)];
    },
    write: (object) => {
      const type = uvarint64ToBuf(instanceToType(object));
      const bytes = object.toBytes();
      const size = uvarint64ToBuf(bytes.length);

      return Buffer.concat([type, size, bytes]);
    },
  });
};

import { Transcoder } from './transcoders';
import * as transcoders from './transcoders';

export class BinaryRecord {
  static fromBytes(bytes: Buffer): [BinaryRecord, Buffer] {
    let result = new this();
    let buffer = bytes;

    const transcoders: TranscoderMetadata[] = Reflect.getMetadata("transcoders", result) || [];

    transcoders.forEach(({ name, transcoder }) => {
      let value;
      [value, buffer] = transcoder.read.call(result, buffer);
      (result as any)[name] = value;
    });

    return [result, buffer];
  }

  toBytes(): Buffer {
    const transcoders: TranscoderMetadata[] = (Reflect.getMetadata("transcoders", this) || []);

    let buffer = Buffer.alloc(0);
    transcoders.forEach(({ name, transcoder }) => {
      buffer = Buffer.concat([buffer, transcoder.write.call(this, (this as any)[name])]);
    });

    return buffer;
  }
}

export interface TranscoderMetadata<T = any> {
  name: string,
  transcoder: Transcoder<T>,
}

export function Transcode<T>(transcoder: Transcoder<T>) {
  return (target: any, name: string | symbol) => {
    const transcoders = Reflect.getMetadata("transcoders", target) || [];
    transcoders.push({ name, transcoder });
    Reflect.defineMetadata("transcoders", transcoders, target);
  };
}

export { transcoders };

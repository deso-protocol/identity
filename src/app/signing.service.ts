import { Injectable } from '@angular/core';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';
import * as ecies from '../lib/ecies';
import {CryptoService} from './crypto.service';
import * as sha256 from 'sha256';
import { uvarint64ToBuf } from '../lib/bindata/util';
import {decryptShared} from '../lib/ecies';

@Injectable({
  providedIn: 'root'
})
export class SigningService {

  constructor(
    private cryptoService: CryptoService,
  ) { }

  signJWT(seedHex: string): string {
    const keyEncoder = new KeyEncoder('secp256k1');
    const encodedPrivateKey = keyEncoder.encodePrivate(seedHex, 'raw', 'pem');
    return jsonwebtoken.sign({ }, encodedPrivateKey, { algorithm: 'ES256', expiresIn: 60 * 10 });
  }

  encryptMessage(seedHex: string, recipientPublicKey: string, message: string): string {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer(undefined,32);

    const publicKeyBuffer = this.cryptoService.publicKeyToECBuffer(recipientPublicKey);
    try {
      const encryptedMessage = ecies.encryptShared(privateKeyBuffer, publicKeyBuffer, message);
      return encryptedMessage.toString('hex');
    } catch (e) {
      console.error(e);
    }
    return '';
  }

  // Legacy decryption for older clients
  // @param encryptedHexes : string[]
  decryptMessagesLegacy(seedHex: string, encryptedHexes: any): { [key: string]: any } {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer(undefined,32);

    const decryptedHexes: { [key: string]: any } = {};
    for (const encryptedHex of encryptedHexes) {
      const encryptedBytes = new Buffer(encryptedHex, 'hex');
      const opts = {legacy: true};
      try {
        decryptedHexes[encryptedHex] = ecies.decrypt(privateKeyBuffer, encryptedBytes, opts).toString();
      } catch (e){
        console.error(e);
      }
    }
    return decryptedHexes;
  }

  // Decrypt messages encrypted with shared secret
  // @param encryptedMessages : {
  //     EncryptedHex: string,
  //     PublicKey: string,
  //     IsSender: bool,
  //     V2: bool,
  // }[]
  decryptMessages(seedHex: string, encryptedMessages: any): { [key: string]: any } {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer(undefined,32);

    const decryptedHexes: { [key: string]: any } = {};
    for (const encryptedMessage of encryptedMessages) {
      const publicKey = encryptedMessage.PublicKey;
      const publicKeyBytes = this.cryptoService.publicKeyToECBuffer(publicKey);
      const encryptedBytes = new Buffer(encryptedMessage.EncryptedHex, 'hex');
      // Check if message was encrypted using shared secret or public key method
      if (encryptedMessage.V2) {
        try {
          decryptedHexes[encryptedMessage.EncryptedHex] = ecies.decryptShared(privateKeyBuffer, publicKeyBytes, encryptedBytes).toString();
        } catch (e) {
          console.error(e);
        }
      } else {
        // If message was encrypted using public key, check
        // the sender to determine if message is decryptable
        try {
          if (!encryptedMessage.IsSender) {
            const opts = {legacy: true};
            decryptedHexes[encryptedMessage.EncryptedHex] = ecies.decrypt(privateKeyBuffer, encryptedBytes, opts).toString();
          } else {
            decryptedHexes[encryptedMessage.EncryptedHex] = '';
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return decryptedHexes;
  }

  signTransaction(seedHex: string, transactionHex: string): string {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);

    const transactionBytes = new Buffer(transactionHex, 'hex');
    const transactionHash = new Buffer(sha256.x2(transactionBytes), 'hex');
    const signature = privateKey.sign(transactionHash);
    const signatureBytes = new Buffer(signature.toDER());
    const signatureLength = uvarint64ToBuf(signatureBytes.length);

    const signedTransactionBytes = Buffer.concat([
      // This slice is bad. We need to remove the existing signature length field prior to appending the new one.
      // Once we have frontend transaction construction we won't need to do this.
      transactionBytes.slice(0, -1),
      signatureLength,
      signatureBytes,
    ]);

    return signedTransactionBytes.toString('hex');
  }

  signBurn(seedHex: string, unsignedHashes: string[]): string[] {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const signedHashes = [];

    for (const unsignedHash of unsignedHashes) {
      const signature = privateKey.sign(unsignedHash);
      const signatureBytes = new Buffer(signature.toDER());
      signedHashes.push(signatureBytes.toString('hex'));
    }

    return signedHashes;
  }
}

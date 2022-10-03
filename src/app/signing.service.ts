import { Injectable } from '@angular/core';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';
import * as ecies from '../lib/ecies';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';
import * as sha256 from 'sha256';
import { uvarint64ToBuf } from '../lib/bindata/util';
import { ec } from 'elliptic';

@Injectable({
  providedIn: 'root',
})
export class SigningService {
  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService
  ) {}

  signJWT(
    seedHex: string,
    isDerived: boolean,
    expiration: string | number = 60 * 10
  ): string {
    const keyEncoder = new KeyEncoder('secp256k1');
    const encodedPrivateKey = keyEncoder.encodePrivate(seedHex, 'raw', 'pem');
    if (isDerived) {
      const derivedPrivateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
      const derivedPublicKeyBase58Check =
        this.cryptoService.privateKeyToDeSoPublicKey(
          derivedPrivateKey,
          this.globalVars.network
        );

      return jsonwebtoken.sign(
        {
          [this.globalVars.claimJwtDerivedPublicKey]:
            derivedPublicKeyBase58Check,
        },
        encodedPrivateKey,
        { algorithm: 'ES256', expiresIn: expiration }
      );
    } else {
      return jsonwebtoken.sign({}, encodedPrivateKey, {
        algorithm: 'ES256',
        expiresIn: expiration,
      });
    }
  }

  signTransaction(
    seedHex: string,
    transactionHex: string,
    isDerivedKey: boolean
  ): string {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);

    const transactionBytes = new Buffer(transactionHex, 'hex');
    const transactionHash = new Buffer(sha256.x2(transactionBytes), 'hex');
    const signature = privateKey.sign(transactionHash, { canonical: true });
    const signatureBytes = new Buffer(signature.toDER());
    const signatureLength = uvarint64ToBuf(signatureBytes.length);

    // If transaction is signed with a derived key, use DeSo-DER recoverable signature encoding.
    if (isDerivedKey) {
      signatureBytes[0] += 1 + (signature.recoveryParam as number);
    }

    const signedTransactionBytes = Buffer.concat([
      // This slice is bad. We need to remove the existing signature length field prior to appending the new one.
      // Once we have frontend transaction construction we won't need to do this.
      transactionBytes.slice(0, -1),
      signatureLength,
      signatureBytes,
    ]);

    return signedTransactionBytes.toString('hex');
  }

  signHashes(seedHex: string, unsignedHashes: string[]): string[] {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const signedHashes = [];

    for (const unsignedHash of unsignedHashes) {
      const signature = privateKey.sign(unsignedHash);
      const signatureBytes = new Buffer(signature.toDER());
      signedHashes.push(signatureBytes.toString('hex'));
    }

    return signedHashes;
  }

  signHashesETH(
    seedHex: string,
    unsignedHashes: string[]
  ): { s: any; r: any; v: number | null }[] {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const signedHashes = [];

    for (const unsignedHash of unsignedHashes) {
      const signature = privateKey.sign(unsignedHash, { canonical: true });

      signedHashes.push({
        s: '0x' + signature.s.toString('hex'),
        r: '0x' + signature.r.toString('hex'),
        v: signature.recoveryParam,
      });
    }

    return signedHashes;
  }

  encryptGroupMessagingPrivateKeyToMember(memberMessagingPublicKeyBase58Check: string, privateKeyHex: string): string {
    const memberMessagingPkKeyPair = this.cryptoService.publicKeyToECKeyPair(memberMessagingPublicKeyBase58Check);
    // @ts-ignore
    const messagingPkBuffer = new Buffer(memberMessagingPkKeyPair.getPublic('arr'));
    return ecies.encrypt(messagingPkBuffer, privateKeyHex, { legacy: false }).toString('hex');
  }
  decryptGroupMessagingPrivateKeyToMember(privateKeyBuffer: Buffer, encryptedPrivateKeyBuffer: Buffer): ec.KeyPair {
    const memberMessagingPriv = ecies.decrypt(privateKeyBuffer, encryptedPrivateKeyBuffer, { legacy: false }).toString();
    const EC = new ec('secp256k1');
    return EC.keyFromPrivate(memberMessagingPriv);
  }
}

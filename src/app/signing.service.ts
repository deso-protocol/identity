import { Injectable } from '@angular/core';
import { ec } from 'elliptic';
import KeyEncoder from 'key-encoder';
import * as sha256 from 'sha256';
import { uvarint64ToBuf } from '../lib/bindata/util';
import { TransactionV0 } from '../lib/deso/transaction';
import * as ecies from '../lib/ecies';
import { signJwtES256 } from '../lib/jwt';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';

@Injectable({
  providedIn: 'root',
})
export class SigningService {
  private static readonly HASH_LENGTH_BYTES = 32;
  private static readonly MAX_HASHES_PER_REQUEST = 1000;
  private static readonly HASH_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService
  ) {}

  signJWT(
    seedHex: string,
    isDerived: boolean,
    { expiration = 60 * 10 }: { expiration?: string | number } = {}
  ): string {
    const keyEncoder = new KeyEncoder('secp256k1');
    const keys = this.cryptoService.seedHexToKeyPair(seedHex);
    const encodedPrivateKey = keyEncoder.encodePrivate(
      keys.getPrivate('hex'),
      'raw',
      'pem'
    );
    if (isDerived) {
      const derivedPrivateKey = this.cryptoService.seedHexToKeyPair(seedHex);
      const derivedPublicKeyBase58Check =
        this.cryptoService.privateKeyToDeSoPublicKey(
          derivedPrivateKey,
          this.globalVars.network
        );

      return signJwtES256(
        {
          [this.globalVars.claimJwtDerivedPublicKey]:
            derivedPublicKeyBase58Check,
        },
        encodedPrivateKey,
        expiration
      );
    } else {
      return signJwtES256({}, encodedPrivateKey, expiration);
    }
  }

  signTransaction(
    seedHex: string,
    transactionHex: string,
    isDerivedKey: boolean
  ): string {
    const privateKey = this.cryptoService.seedHexToKeyPair(seedHex);

    const transactionBytes = new Buffer(transactionHex, 'hex');
    const [_, v1FieldsBuffer] = TransactionV0.fromBytes(transactionBytes) as [
      TransactionV0,
      Buffer
    ];
    const signatureIndex = v1FieldsBuffer.length
      ? transactionBytes.indexOf(v1FieldsBuffer) - 1
      : -1;
    const v0FieldsWithoutSignature = transactionBytes.slice(0, signatureIndex);
    const transactionHash = new Buffer(sha256.x2(transactionBytes), 'hex');
    const signature = privateKey.sign(transactionHash, { canonical: true });
    const signatureBytes = new Buffer(signature.toDER());
    const signatureLength = new Buffer(uvarint64ToBuf(signatureBytes.length));

    // If transaction is signed with a derived key, use DeSo-DER recoverable signature encoding.
    if (isDerivedKey) {
      signatureBytes[0] += 1 + (signature.recoveryParam as number);
    }

    return Buffer.concat([
      v0FieldsWithoutSignature,
      signatureLength,
      signatureBytes,
      v1FieldsBuffer,
    ]).toString('hex');
  }

  signHashes(seedHex: string, unsignedHashes: unknown): string[] {
    const hashBuffers = this.validateUnsignedHashes(unsignedHashes);
    const privateKey = this.cryptoService.seedHexToKeyPair(seedHex);
    const signedHashes: string[] = [];

    for (const hashBuffer of hashBuffers) {
      const signature = privateKey.sign(hashBuffer);
      const signatureBytes = Buffer.from(signature.toDER());
      signedHashes.push(signatureBytes.toString('hex'));
    }

    return signedHashes;
  }

  signHashesETH(
    seedHex: string,
    unsignedHashes: unknown
  ): { s: any; r: any; v: number | null }[] {
    const hashBuffers = this.validateUnsignedHashes(unsignedHashes);
    const privateKey = this.cryptoService.seedHexToKeyPair(seedHex);
    const signedHashes = [];

    for (const hashBuffer of hashBuffers) {
      const signature = privateKey.sign(hashBuffer, { canonical: true });

      signedHashes.push({
        s: '0x' + signature.s.toString('hex'),
        r: '0x' + signature.r.toString('hex'),
        v: signature.recoveryParam,
      });
    }

    return signedHashes;
  }

  private validateUnsignedHashes(unsignedHashes: unknown): Buffer[] {
    if (!Array.isArray(unsignedHashes)) {
      throw new Error('Unsigned hashes must be an array');
    }
    if (unsignedHashes.length === 0) {
      throw new Error('At least one unsigned hash is required');
    }
    if (unsignedHashes.length > SigningService.MAX_HASHES_PER_REQUEST) {
      throw new Error(
        `A maximum of ${SigningService.MAX_HASHES_PER_REQUEST} hashes may be signed at once`
      );
    }

    return unsignedHashes.map((unsignedHash, index) => {
      if (
        typeof unsignedHash !== 'string' ||
        !SigningService.HASH_HEX_PATTERN.test(unsignedHash)
      ) {
        throw new Error(
          `Unsigned hash at index ${index} must be exactly 32 bytes encoded as hexadecimal`
        );
      }

      const hashBuffer = Buffer.from(unsignedHash, 'hex');
      if (hashBuffer.length !== SigningService.HASH_LENGTH_BYTES) {
        throw new Error(
          `Unsigned hash at index ${index} must decode to exactly 32 bytes`
        );
      }
      return hashBuffer;
    });
  }

  encryptGroupMessagingPrivateKeyToMember(
    memberMessagingPublicKeyBase58Check: string,
    privateKeyHex: string
  ): string {
    const memberMessagingPkKeyPair = this.cryptoService.publicKeyToECKeyPair(
      memberMessagingPublicKeyBase58Check
    );
    const messagingPkBuffer = new Buffer(
      // @ts-ignore
      memberMessagingPkKeyPair.getPublic('arr')
    );
    return ecies
      .encrypt(messagingPkBuffer, privateKeyHex, { legacy: false })
      .toString('hex');
  }
  decryptGroupMessagingPrivateKeyToMember(
    privateKeyBuffer: Buffer,
    encryptedPrivateKeyBuffer: Buffer
  ): ec.KeyPair {
    const memberMessagingPriv = ecies
      .decrypt(privateKeyBuffer, encryptedPrivateKeyBuffer, { legacy: false })
      .toString();
    const EC = new ec('secp256k1');
    return EC.keyFromPrivate(memberMessagingPriv);
  }
}

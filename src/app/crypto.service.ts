import { Injectable } from '@angular/core';
import HDNode from 'hdkey';
import * as bip39 from 'bip39';
import HDKey from 'hdkey';
import {ec as EC} from 'elliptic';
import bs58check from 'bs58check';
import {CookieService} from 'ngx-cookie';
import {createHmac, createCipher, createDecipher, randomBytes} from 'crypto';
import {AccessLevel, Network} from '../types/identity';
import { GlobalVarsService } from './global-vars.service';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  constructor(
    private cookieService: CookieService,
    private globalVars: GlobalVarsService
    ) {}

  static PUBLIC_KEY_PREFIXES = {
    mainnet: {
      bitcoin: [0x00],
      bitclout: [0xcd, 0x14, 0x0],
    },
    testnet: {
      bitcoin: [0x6f],
      bitclout: [0x11, 0xc2, 0x0],
    }
  };

  // Safari only lets us store things in cookies
  mustUseStorageAccess(): boolean {
    // Webviews have full control over storage access
    if (this.globalVars.webview) {
      return false;
    }

    const supportsStorageAccess = typeof document.hasStorageAccess === 'function';
    const isChrome = navigator.userAgent.indexOf('Chrome') > -1;
    const isSafari = !isChrome && navigator.userAgent.indexOf('Safari') > -1;

    // Firefox and Edge support the storage access API but do not enforce it.
    // For now, only use cookies if we support storage access and use Safari.
    const mustUseStorageAccess = supportsStorageAccess && isSafari;

    return mustUseStorageAccess;
  }

  // 32 bytes = 256 bits is plenty of entropy for encryption
  newEncryptionKey(): string {
    return randomBytes(32).toString('hex');
  }

  seedHexEncryptionStorageKey(hostname: string): string {
    return `seed-hex-key-${hostname}`;
  }

  hasSeedHexEncryptionKey(hostname: string): boolean {
    const storageKey = this.seedHexEncryptionStorageKey(hostname);

    if (this.mustUseStorageAccess()) {
      return !!this.cookieService.get(storageKey);
    } else {
      return !!localStorage.getItem(storageKey);
    }
  }

  seedHexEncryptionKey(hostname: string): string {
    const storageKey = this.seedHexEncryptionStorageKey(hostname);
    let encryptionKey;

    if (this.mustUseStorageAccess()) {
      encryptionKey = this.cookieService.get(storageKey);
      if (!encryptionKey) {
        encryptionKey = this.newEncryptionKey();
        this.cookieService.put(storageKey, encryptionKey, {
          expires: new Date('2100/01/01 00:00:00'),
        });
      }
    } else {
      encryptionKey = localStorage.getItem(storageKey) || '';
      if (!encryptionKey) {
        encryptionKey = this.newEncryptionKey();
        localStorage.setItem(storageKey, encryptionKey);
      }
    }

    // If the encryption key is unset or malformed we need to stop
    // everything to avoid returning unencrypted information.
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('Failed to load or generate encryption key; this should never happen');
    }

    return encryptionKey;
  }

  encryptSeedHex(seedHex: string, hostname: string): string {
    const encryptionKey = this.seedHexEncryptionKey(hostname);
    const cipher = createCipher('aes-256-gcm', encryptionKey);
    return cipher.update(seedHex).toString('hex');
  }

  decryptSeedHex(encryptedSeedHex: string, hostname: string): string {
    const encryptionKey = this.seedHexEncryptionKey(hostname);
    const decipher = createDecipher('aes-256-gcm', encryptionKey);
    return decipher.update(Buffer.from(encryptedSeedHex, 'hex')).toString();
  }

  accessLevelHmac(accessLevel: AccessLevel, seedHex: string): string {
    const hmac = createHmac('sha256', seedHex);
    return hmac.update(accessLevel.toString()).digest().toString('hex');
  }

  validAccessLevelHmac(accessLevel: AccessLevel, seedHex: string, hmac: string): boolean {
    if (!hmac || !seedHex) {
      return false;
    }

    return hmac === this.accessLevelHmac(accessLevel, seedHex);
  }

  encryptedSeedHexToPrivateKey(encryptedSeedHex: string, domain: string): EC.KeyPair {
    const seedHex = this.decryptSeedHex(encryptedSeedHex, domain);
    return this.seedHexToPrivateKey(seedHex);
  }

  mnemonicToKeychain(mnemonic: string, extraText?: string, nonStandard?: boolean): HDNode {
    const seed = bip39.mnemonicToSeedSync(mnemonic, extraText);
    // @ts-ignore
    return HDKey.fromMasterSeed(seed).derive('m/44\'/0\'/0\'/0/0', nonStandard);
  }

  keychainToSeedHex(keychain: HDNode): string {
    return keychain.privateKey.toString('hex');
  }

  seedHexToPrivateKey(seedHex: string): EC.KeyPair {
    const ec = new EC('secp256k1');
    return ec.keyFromPrivate(seedHex);
  }

  privateKeyToBitcloutPublicKey(privateKey: EC.KeyPair, network: Network): string {
    const prefix = CryptoService.PUBLIC_KEY_PREFIXES[network].bitclout;
    const key = privateKey.getPublic().encode('array', true);
    const prefixAndKey = Uint8Array.from([...prefix, ...key]);

    return bs58check.encode(prefixAndKey);
  }

  // Decode public key base58check to Buffer of secp256k1 public key
  publicKeyToECBuffer(publicKey: string): Buffer {
    // Sanity check similar to Base58CheckDecodePrefix from core/lib/base58.go
    if (publicKey.length < 5){
      throw new Error('Failed to decode public key');
    }
    const decoded = bs58check.decode(publicKey);
    const payload = Uint8Array.from(decoded).slice(3);

    const ec = new EC('secp256k1');
    const publicKeyEC = ec.keyFromPublic(payload, 'array');

    return new Buffer(publicKeyEC.getPublic('array'));
  }

  keychainToBtcAddress(keychain: HDNode, network: Network): string {
    const prefix = CryptoService.PUBLIC_KEY_PREFIXES[network].bitcoin;
    // @ts-ignore TODO: add "identifier" to type definition
    const identifier = keychain.identifier;
    const prefixAndKey = Uint8Array.from([...prefix, ...identifier]);

    return bs58check.encode(prefixAndKey);
  }
}

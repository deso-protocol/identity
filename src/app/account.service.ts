import {Injectable} from '@angular/core';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';
import {AccessLevel, Network, DerivedPrivateUserInfo, PrivateUserInfo, PrivateUserVersion, PublicUserInfo} from '../types/identity';
import {CookieService} from 'ngx-cookie';
import HDKey from 'hdkey';
import {EntropyService} from './entropy.service';
import {SigningService} from './signing.service';
import sha256 from 'sha256';
import {uint64ToBufBigEndian} from '../lib/bindata/util';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';
import * as ecies from '../lib/ecies';
import {ec as EC} from 'elliptic';
import { TransactionSpendingLimit } from 'src/lib/deso/transaction';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private static usersStorageKey = 'users';
  private static levelsStorageKey = 'levels';

  private static publicKeyRegex = /^[a-zA-Z0-9]{54,55}$/;

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService,
    private cookieService: CookieService,
    private entropyService: EntropyService,
    private signingService: SigningService
  ) { }

  // Public Getters

  getPublicKeys(): any {
    return Object.keys(this.getPrivateUsers());
  }

  getEncryptedUsers(): {[key: string]: PublicUserInfo} {
    const hostname = this.globalVars.hostname;
    const privateUsers = this.getPrivateUsers();
    const publicUsers: {[key: string]: PublicUserInfo} = {};

    for (const publicKey of Object.keys(privateUsers)) {
      const privateUser = privateUsers[publicKey];
      const accessLevel = this.getAccessLevel(publicKey, hostname);
      if (accessLevel === AccessLevel.None) {
        continue;
      }

      const encryptedSeedHex = this.cryptoService.encryptSeedHex(privateUser.seedHex, hostname);
      const accessLevelHmac = this.cryptoService.accessLevelHmac(accessLevel, privateUser.seedHex);

      publicUsers[publicKey] = {
        hasExtraText: privateUser.extraText?.length > 0,
        btcDepositAddress: privateUser.btcDepositAddress,
        ethDepositAddress: privateUser.ethDepositAddress,
        version: privateUser.version,
        encryptedSeedHex,
        network: privateUser.network,
        accessLevel,
        accessLevelHmac,
      };
    }

    return publicUsers;
  }

  getAccessLevel(publicKey: string, hostname: string): AccessLevel {
    if (GlobalVarsService.noAccessHostnames.includes(hostname)) {
      return AccessLevel.None;
    }

    const levels = JSON.parse(localStorage.getItem(AccountService.levelsStorageKey) || '{}');
    const hostMapping = levels[hostname] || {};
    const accessLevel = hostMapping[publicKey];

    if (Object.values(AccessLevel).includes(accessLevel)) {
      return accessLevel;
    } else if (GlobalVarsService.fullAccessHostnames.includes(hostname)) {
      return AccessLevel.Full;
    } else {
      return AccessLevel.None;
    }
  }

  getDerivedPrivateUser(publicKeyBase58Check: string, blockHeight: number,
                        transactionSpendingLimitHex?: string,
                        derivedPublicKeyBase58CheckInput?: string,
                        expirationDays?: number): DerivedPrivateUserInfo{
    const privateUser = this.getPrivateUsers()[publicKeyBase58Check];
    const network = privateUser.network;

    let derivedSeedHex = '';
    let derivedPublicKeyBuffer: number[];
    let derivedPublicKeyBase58Check: string;
    let jwt = '';
    let derivedJwt = '';
    const numDaysBeforeExpiration = expirationDays || 30;

    this.entropyService.setNewTemporaryEntropy();
    const derivedMnemonic = this.entropyService.temporaryEntropy?.mnemonic;
    const derivedKeychain = this.cryptoService.mnemonicToKeychain(derivedMnemonic);
    if (!derivedPublicKeyBase58CheckInput) {
      // If the user hasn't passed in a derived public key, create it.
      derivedSeedHex = this.cryptoService.keychainToSeedHex(derivedKeychain);
      const derivedPrivateKey = this.cryptoService.seedHexToPrivateKey(derivedSeedHex);
      derivedPublicKeyBase58Check = this.cryptoService.privateKeyToDeSoPublicKey(derivedPrivateKey, network);
      derivedPublicKeyBuffer = derivedPrivateKey.getPublic().encode('array', true);

      // We compute an owner JWT with a month-long expiration. This is needed for some backend endpoints.
      const keyEncoder = new KeyEncoder('secp256k1');
      const encodedPrivateKey = keyEncoder.encodePrivate(privateUser.seedHex, 'raw', 'pem');
      jwt = jsonwebtoken.sign({ }, encodedPrivateKey, { algorithm: 'ES256', expiresIn: '30 days' });

      // We compute a derived key JWT with a month-long expiration. This is needed for shared secret endpoint.
      const encodedDerivedPrivateKey = keyEncoder.encodePrivate(derivedSeedHex, 'raw', 'pem');
      derivedJwt = jsonwebtoken.sign({ }, encodedDerivedPrivateKey, { algorithm: 'ES256', expiresIn: `${ numDaysBeforeExpiration } days` });
    } else {
      // If the user has passed in a derived public key, use that instead.
      // Don't define the derived seed hex (a private key presumably already exists).
      // Don't define the JWT, since we have no private key to sign it with.
      derivedPublicKeyBase58Check = derivedPublicKeyBase58CheckInput;
      derivedPublicKeyBuffer = this.cryptoService.publicKeyToBuffer(derivedPublicKeyBase58CheckInput);
    }

    // Generate new btc and eth deposit addresses for the derived key.
    // const btcDepositAddress = this.cryptoService.keychainToBtcAddress(derivedKeychain, network);
    // const ethDepositAddress = this.cryptoService.seedHexToEthAddress(derivedSeedHex);
    const btcDepositAddress = 'Not implemented yet';
    const ethDepositAddress = 'Not implemented yet';

    // days * (24 hours / day) * (60 minutes / hour) * (1 block / 5 minutes) = blocks
    const numBlocksBeforeExpiration = numDaysBeforeExpiration * 24 * 60 / 5;

    // By default, we authorize this derived key for 8640 blocks, which is about 30 days.
    const expirationBlock = blockHeight + numBlocksBeforeExpiration;

    const expirationBlockBuffer = uint64ToBufBigEndian(expirationBlock);
    const transactionSpendingLimitBytes = transactionSpendingLimitHex ? [... new Buffer(transactionSpendingLimitHex, 'hex')] : [];
    const accessHash = sha256.x2([...derivedPublicKeyBuffer, ...expirationBlockBuffer, ...transactionSpendingLimitBytes]);
    const accessSignature = this.signingService.signHashes(privateUser.seedHex, [accessHash])[0];

    // Set the default messaging key name
    const messagingKeyName = this.globalVars.defaultMessageKeyName;
    // Compute messaging private key as sha256x2( sha256x2(secret key) || sha256x2(messageKeyname) )
    const messagingPrivateKeyBuff = this.cryptoService.deriveMessagingKey(privateUser.seedHex, messagingKeyName);
    const messagingPrivateKey = messagingPrivateKeyBuff.toString('hex');
    const ec = new EC('secp256k1');

    // We do this to compress the messaging public key from 65 bytes to 33 bytes.
    const messagingPublicKey = ec.keyFromPublic(ecies.getPublic(messagingPrivateKeyBuff), 'array').getPublic(true, 'hex');
    const messagingPublicKeyBase58Check = this.cryptoService.privateKeyToDeSoPublicKey(
      ec.keyFromPrivate(messagingPrivateKeyBuff), this.globalVars.network);

    // Messaging key signature is needed so if derived key submits the messaging public key,
    // consensus can verify integrity of that public key. We compute ecdsa( sha256x2( messagingPublicKey || messagingKeyName ) )
    const messagingKeyHash = sha256.x2([...new Buffer(messagingPublicKey, 'hex'), ...new Buffer(messagingKeyName, 'utf8')]);
    const messagingKeySignature = this.signingService.signHashes(privateUser.seedHex, [messagingKeyHash])[0];

    return {
      derivedSeedHex,
      derivedPublicKeyBase58Check,
      publicKeyBase58Check,
      btcDepositAddress,
      ethDepositAddress,
      expirationBlock,
      network,
      accessSignature,
      jwt,
      derivedJwt,
      messagingPublicKeyBase58Check,
      messagingPrivateKey,
      messagingKeyName,
      messagingKeySignature,
      transactionSpendingLimitHex
    };
  }

  // Public Modifiers

  addUser(keychain: HDKey, mnemonic: string, extraText: string, network: Network, google?: boolean): string {
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);
    const ethDepositAddress = this.cryptoService.seedHexToEthAddress(seedHex);

    return this.addPrivateUser({
      seedHex,
      mnemonic,
      extraText,
      btcDepositAddress,
      ethDepositAddress,
      network,
      google,
      version: PrivateUserVersion.V1,
    });
  }

  deleteUser(publicKey: string): void {
    const privateUsers = this.getPrivateUsersRaw();

    delete privateUsers[publicKey];

    this.setPrivateUsersRaw(privateUsers);
  }

  setAccessLevel(publicKey: string, hostname: string, accessLevel: AccessLevel): void {
    const levels = JSON.parse(localStorage.getItem(AccountService.levelsStorageKey) || '{}');

    levels[hostname] ||= {};
    levels[hostname][publicKey] = accessLevel;

    localStorage.setItem(AccountService.levelsStorageKey, JSON.stringify(levels));
  }

  // Migrations

  migrate(): void {
    const privateUsers = this.getPrivateUsersRaw();

    for (const publicKey of Object.keys(privateUsers)) {
      const privateUser = privateUsers[publicKey];

      // Migrate from null to V0
      if (privateUser.version == null) {
        // Add version field
        privateUser.version = PrivateUserVersion.V0;
      }

      // Migrate from V0 -> V1
      if (privateUser.version === PrivateUserVersion.V0) {
        // Add ethDepositAddress field
        privateUser.ethDepositAddress = this.cryptoService.seedHexToEthAddress(privateUser.seedHex);

        // Increment version
        privateUser.version = PrivateUserVersion.V1;
      }

      privateUsers[publicKey] = privateUser;
    }

    this.setPrivateUsersRaw(privateUsers);
  }

  getPrivateSharedSecret(ownerPublicKey: string, publicKey: string): string {
    const privateUsers = this.getPrivateUsers();
    if ( !(ownerPublicKey in privateUsers) ) {
      return '';
    }
    const seedHex = privateUsers[ownerPublicKey].seedHex;
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBytes = privateKey.getPrivate().toBuffer(undefined, 32);
    const publicKeyBytes = this.cryptoService.publicKeyToECBuffer(publicKey);
    const sharedPx = ecies.derive(privateKeyBytes, publicKeyBytes);
    const sharedPrivateKey = ecies.kdf(sharedPx, 32);
    return sharedPrivateKey.toString('hex');
  }

  // Private Getters and Modifiers

  // TEMP: public for import flow
  public addPrivateUser(userInfo: PrivateUserInfo): string {
    const privateUsers = this.getPrivateUsersRaw();
    const privateKey = this.cryptoService.seedHexToPrivateKey(userInfo.seedHex);
    const publicKey = this.cryptoService.privateKeyToDeSoPublicKey(privateKey, userInfo.network);

    privateUsers[publicKey] = userInfo;

    this.setPrivateUsersRaw(privateUsers);

    return publicKey;
  }

  private getPrivateUsers(): {[key: string]: PrivateUserInfo} {
    const privateUsers = this.getPrivateUsersRaw();
    const filteredPrivateUsers: {[key: string]: PrivateUserInfo} = {};

    for (const publicKey of Object.keys(privateUsers)) {
      const privateUser = privateUsers[publicKey];

      // Only include users from the current network
      if (privateUser.network !== this.globalVars.network) {
        continue;
      }

      // Get rid of some users who have invalid public keys
      if (!publicKey.match(AccountService.publicKeyRegex)) {
        this.deleteUser(publicKey);
        continue;
      }

      filteredPrivateUsers[publicKey] = privateUser;
    }

    return filteredPrivateUsers;
  }

  private getPrivateUsersRaw(): {[key: string]: PrivateUserInfo} {
    return JSON.parse(localStorage.getItem(AccountService.usersStorageKey) || '{}');
  }

  private setPrivateUsersRaw(privateUsers: {[key: string]: PrivateUserInfo}): void {
    localStorage.setItem(AccountService.usersStorageKey, JSON.stringify(privateUsers));
  }
}

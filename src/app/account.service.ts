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

  getDerivedPrivateUser(publicKey: string, blockHeight: number): DerivedPrivateUserInfo{
    const privateUser = this.getPrivateUsers()[publicKey];
    const network = privateUser.network;

    this.entropyService.setNewTemporaryEntropy();
    const derivedMnemonic = this.entropyService.temporaryEntropy?.mnemonic;
    const derivedKeychain = this.cryptoService.mnemonicToKeychain(derivedMnemonic);
    const derivedSeedHex = this.cryptoService.keychainToSeedHex(derivedKeychain);
    const derivedPrivateKey = this.cryptoService.seedHexToPrivateKey(derivedSeedHex);
    const derivedPublicKey = this.cryptoService.privateKeyToDeSoPublicKey(derivedPrivateKey, network);

    // Generate new btc and eth deposit addresses for the derived key.
    // const btcDepositAddress = this.cryptoService.keychainToBtcAddress(derivedKeychain, network);
    // const ethDepositAddress = this.cryptoService.seedHexToEthAddress(derivedSeedHex);
    const btcDepositAddress = 'Not implemented yet';
    const ethDepositAddress = 'Not implemented yet';

    // By default we authorize this derived key for 10,000 blocks.
    const expirationBlock = blockHeight + 10000;

    const expirationBlockBuffer = uint64ToBufBigEndian(expirationBlock);
    const derivedPublicKeyBuffer = derivedPrivateKey.getPublic().encode('array', true);
    const accessHash = sha256.x2([...derivedPublicKeyBuffer, ...expirationBlockBuffer]);
    const accessSignature = this.signingService.signHashes(privateUser.seedHex, [accessHash])[0];

    // We compute an owner JWT with a month-long expiration. This is needed for some backend endpoints.
    const keyEncoder = new KeyEncoder('secp256k1');
    const encodedPrivateKey = keyEncoder.encodePrivate(privateUser.seedHex, 'raw', 'pem');
    const jwt = jsonwebtoken.sign({ }, encodedPrivateKey, { algorithm: 'ES256', expiresIn: '30 days' });

    // We compute a derived key JWT with a month-long expiration. This is needed for shared secret endpoint.
    const encodedDerivedPrivateKey = keyEncoder.encodePrivate(derivedSeedHex, 'raw', 'pem');
    const derivedJwt = jsonwebtoken.sign({ }, encodedDerivedPrivateKey, { algorithm: 'ES256', expiresIn: '30 days' });

    return {
      derivedSeedHex,
      derivedPublicKey,
      publicKey,
      btcDepositAddress,
      ethDepositAddress,
      expirationBlock,
      network,
      accessSignature,
      jwt,
      derivedJwt
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
      if (privateUser.version == PrivateUserVersion.V0) {
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

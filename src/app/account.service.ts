import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';
import {
  AccessLevel,
  DerivedPrivateUserInfo,
  LoginMethod,
  Network,
  PrivateUserInfo,
  PrivateUserVersion,
  PublicUserInfo,
} from '../types/identity';
import { CookieService } from 'ngx-cookie';
import HDKey from 'hdkey';
import { EntropyService } from './entropy.service';
import { SigningService } from './signing.service';
import sha256 from 'sha256';
import { uint64ToBufBigEndian } from '../lib/bindata/util';
import * as ecies from '../lib/ecies';
import { ec as EC } from 'elliptic';
import {
  BackendAPIService,
  GetAccessBytesResponse,
  TransactionSpendingLimitResponse,
} from './backend-api.service';
import { MetamaskService } from './metamask.service';
import * as bs58check from 'bs58check';
import {
  Transaction,
  TransactionMetadataAuthorizeDerivedKey,
} from '../lib/deso/transaction';

@Injectable({
  providedIn: 'root',
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
    private signingService: SigningService,
    private backendApi: BackendAPIService,
    private metamaskService: MetamaskService
  ) {}

  // Public Getters

  getPublicKeys(): any {
    return Object.keys(this.getPrivateUsers());
  }

  getEncryptedUsers(): { [key: string]: PublicUserInfo } {
    const hostname = this.globalVars.hostname;
    const privateUsers = this.getPrivateUsers();
    const publicUsers: { [key: string]: PublicUserInfo } = {};

    for (const publicKey of Object.keys(privateUsers)) {
      const privateUser = privateUsers[publicKey];
      const accessLevel = this.getAccessLevel(publicKey, hostname);
      if (accessLevel === AccessLevel.None) {
        continue;
      }

      const encryptedSeedHex = this.cryptoService.encryptSeedHex(
        privateUser.seedHex,
        hostname
      );
      const accessLevelHmac = this.cryptoService.accessLevelHmac(
        accessLevel,
        privateUser.seedHex
      );

      publicUsers[publicKey] = {
        hasExtraText: privateUser.extraText?.length > 0,
        btcDepositAddress: privateUser.btcDepositAddress,
        ethDepositAddress: privateUser.ethDepositAddress,
        version: privateUser.version,
        encryptedSeedHex,
        network: privateUser.network,
        loginMethod: privateUser.loginMethod || LoginMethod.DESO,
        accessLevel,
        accessLevelHmac,
      };
    }

    return publicUsers;
  }

  // Check if the account is signed in via a derived key.
  isMetamaskAccount(userInfo: PublicUserInfo | PrivateUserInfo): boolean {
    return userInfo.loginMethod === LoginMethod.METAMASK;
  }
  isDerivedKeyAccountFromEncryptedSeedHex(encryptedSeedHex: string): boolean {
    const publicUsers = this.getEncryptedUsers();

    // Check if this user was signed in via a derived key.
    for (const publicKey of Object.keys(publicUsers)) {
      const user = publicUsers[publicKey];
      if (user.encryptedSeedHex === encryptedSeedHex) {
        return this.isMetamaskAccount(user);
      }
    }
    return false;
  }

  getAccessLevel(publicKey: string, hostname: string): AccessLevel {
    if (GlobalVarsService.noAccessHostnames.includes(hostname)) {
      return AccessLevel.None;
    }

    const levels = JSON.parse(
      localStorage.getItem(AccountService.levelsStorageKey) || '{}'
    );
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

  public async getDerivedPrivateUser(
    publicKeyBase58Check: string,
    blockHeight: number,
    transactionSpendingLimit?: TransactionSpendingLimitResponse,
    derivedPublicKeyBase58CheckInput?: string,
    expirationDays?: number
  ): Promise<DerivedPrivateUserInfo | undefined> {
    const privateUser = this.getPrivateUsers()[publicKeyBase58Check];
    const network = privateUser.network;
    const isMetamask = this.isMetamaskAccount(privateUser);

    let derivedSeedHex = '';
    let derivedPublicKeyBuffer: number[];
    let derivedPublicKeyBase58Check: string;
    let jwt = '';
    let derivedJwt = '';
    const numDaysBeforeExpiration = expirationDays || 30;

    if (!derivedPublicKeyBase58CheckInput) {
      const derivedKeyData = this.generateDerivedKey(network);
      derivedPublicKeyBase58Check = derivedKeyData.derivedPublicKeyBase58Check;
      derivedSeedHex = this.cryptoService.keychainToSeedHex(
        derivedKeyData.keychain
      );
      derivedPublicKeyBuffer = derivedKeyData.derivedKeyPair
        .getPublic()
        .encode('array', true);

      // Derived keys JWT with the same expiration as the derived key. This is needed for some backend endpoints.
      derivedJwt = this.signingService.signJWT(
        derivedSeedHex,
        true,
        `${numDaysBeforeExpiration} days`
      );
    } else {
      // If the user has passed in a derived public key, use that instead.
      // Don't define the derived seed hex (a private key presumably already exists).
      // Don't define the JWT, since we have no private key to sign it with.
      derivedPublicKeyBase58Check = derivedPublicKeyBase58CheckInput;
      derivedPublicKeyBuffer = this.cryptoService.publicKeyToBuffer(
        derivedPublicKeyBase58CheckInput
      );
    }
    // Compute the owner-signed JWT with the same expiration as the derived key. This is needed for some backend endpoints.
    // In case of the metamask log-in, jwt will be signed by a derived key.
    jwt = this.signingService.signJWT(
      privateUser.seedHex,
      isMetamask,
      `${numDaysBeforeExpiration} days`
    );

    // Generate new btc and eth deposit addresses for the derived key.
    // const btcDepositAddress = this.cryptoService.keychainToBtcAddress(derivedKeychain, network);
    // const ethDepositAddress = this.cryptoService.seedHexToEthAddress(derivedSeedHex);
    const btcDepositAddress = 'Not implemented yet';
    const ethDepositAddress = 'Not implemented yet';

    // days * (24 hours / day) * (60 minutes / hour) * (1 block / 5 minutes) = blocks
    const numBlocksBeforeExpiration = (numDaysBeforeExpiration * 24 * 60) / 5;

    // By default, we authorize this derived key for 8640 blocks, which is about 30 days.
    const expirationBlock = blockHeight + numBlocksBeforeExpiration;

    const expirationBlockBuffer = uint64ToBufBigEndian(expirationBlock);

    // TODO: There is a small attack surface here. If someone gains control of the
    // backendApi node, they can swap a fake value into here, and trick the user
    // into giving up control of their key. The solution is to force users to pass
    // the transactionSpendingLimitHex directly, but this is a worse developer
    // experience. So we trade a little bit of security for developer convenience
    // here, and do the conversion in Identity rather than forcing the devs to do it.
    let actualTransactionSpendingLimit: TransactionSpendingLimitResponse;
    if (!transactionSpendingLimit) {
      actualTransactionSpendingLimit = {
        GlobalDESOLimit: 0,
      } as TransactionSpendingLimitResponse;
    } else {
      actualTransactionSpendingLimit =
        transactionSpendingLimit as TransactionSpendingLimitResponse;
    }

    let response: GetAccessBytesResponse;
    try {
      response = await this.backendApi
        .GetAccessBytes(
          derivedPublicKeyBase58Check,
          expirationBlock,
          actualTransactionSpendingLimit
        )
        .toPromise();
    } catch (e) {
      throw new Error('problem getting spending limit');
    }

    const transactionSpendingLimitHex = response.SpendingLimitHex;
    let accessBytes: number[] = [
      ...derivedPublicKeyBuffer,
      ...expirationBlockBuffer,
    ];
    if (isMetamask) {
      accessBytes = [...Buffer.from(response.AccessBytesHex, 'hex')];
    } else {
      const transactionSpendingLimitBytes = response.SpendingLimitHex
        ? [...new Buffer(response.SpendingLimitHex, 'hex')]
        : [];
      accessBytes.push(...transactionSpendingLimitBytes);
    }
    const accessBytesHex = Buffer.from(accessBytes).toString('hex');
    const accessHash = sha256.x2(accessBytes);

    let accessSignature: string;
    if (isMetamask) {
      // FIXME: if we want to allow generic log-in with derived keys, we should error because a derived key can't produce a
      //  valid access signature. For now, we ignore this because the only derived key log-in is coming through Metamask signup.
      try {
        const { signature } =
          await this.metamaskService.signMessageWithMetamaskAndGetEthAddress(
            accessBytesHex
          );
        // Slice the '0x' prefix from the signature.
        accessSignature = signature.slice(2);
      } catch (e) {
        throw new Error(
          'Something went wrong while producing Metamask signature. Please try again.'
        );
      }
    } else {
      accessSignature = this.signingService.signHashes(privateUser.seedHex, [
        accessHash,
      ])[0];
    }

    let messagingPublicKeyBase58Check,
      messagingPrivateKey,
      messagingKeyName,
      messagingKeySignature: string;
    if (!isMetamask) {
      // Set the default messaging key name
      messagingKeyName = this.globalVars.defaultMessageKeyName;
      // Compute messaging private key as sha256x2( sha256x2(secret key) || sha256x2(messageKeyname) )
      const messagingPrivateKeyBuff = this.cryptoService.deriveMessagingKey(
        privateUser.seedHex,
        messagingKeyName
      );
      messagingPrivateKey = messagingPrivateKeyBuff.toString('hex');
      const ec = new EC('secp256k1');

      // We do this to compress the messaging public key from 65 bytes to 33 bytes.
      const messagingPublicKey = ec
        .keyFromPublic(ecies.getPublic(messagingPrivateKeyBuff), 'array')
        .getPublic(true, 'hex');
      messagingPublicKeyBase58Check =
        this.cryptoService.privateKeyToDeSoPublicKey(
          ec.keyFromPrivate(messagingPrivateKeyBuff),
          this.globalVars.network
        );

      // Messaging key signature is needed so if derived key submits the messaging public key,
      // consensus can verify integrity of that public key. We compute ecdsa( sha256x2( messagingPublicKey || messagingKeyName ) )
      const messagingKeyHash = sha256.x2([
        ...new Buffer(messagingPublicKey, 'hex'),
        ...new Buffer(messagingKeyName, 'utf8'),
      ]);
      messagingKeySignature = this.signingService.signHashes(
        privateUser.seedHex,
        [messagingKeyHash]
      )[0];
    } else {
      messagingPublicKeyBase58Check = 'Not implemented yet';
      messagingPrivateKey = 'Not implemented yet';
      messagingKeyName = 'Not implemented yet';
      messagingKeySignature = 'Not implemented yet';
    }

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
      transactionSpendingLimitHex,
      signedUp: this.globalVars.signedUp,
    };
  }

  /**
   * @returns derivedPublicKeyBase58Check Base58 encoded derived public key
   * @returns derivedKeyPairKey pair object that handles the public private key logic for the derived key
   * Generates a new derived key
   */
  public generateDerivedKey(network: Network): {
    keychain: HDKey;
    mnemonic: string;
    derivedPublicKeyBase58Check: string;
    derivedKeyPair: EC.KeyPair;
  } {
    const e = new EC('secp256k1');
    this.entropyService.setNewTemporaryEntropy();
    const mnemonic = this.entropyService.temporaryEntropy.mnemonic;
    const keychain = this.cryptoService.mnemonicToKeychain(mnemonic);
    const prefix = CryptoService.PUBLIC_KEY_PREFIXES[network].deso;
    const derivedKeyPair = e.keyFromPrivate(keychain.privateKey); // gives us the keypair
    const desoKey = derivedKeyPair.getPublic().encode('array', true);
    const prefixAndKey = Uint8Array.from([...prefix, ...desoKey]);
    const derivedPublicKeyBase58Check = bs58check.encode(prefixAndKey);
    return {
      keychain,
      mnemonic,
      derivedPublicKeyBase58Check,
      derivedKeyPair,
    };
  }

  public verifyAuthorizeDerivedKeyTransaction(
    transactionHex: string,
    derivedKeyPair: EC.KeyPair,
    expirationBlock: number,
    accessSignature: string
  ): boolean {
    const txBytes = new Buffer(transactionHex, 'hex');
    const transaction = Transaction.fromBytes(txBytes)[0] as Transaction;

    // Make sure the transaction has the correct metadata.
    if (
      transaction.metadata?.constructor !==
      TransactionMetadataAuthorizeDerivedKey
    ) {
      return false;
    }

    // Verify the metadata
    const transactionMetadata =
      transaction.metadata as TransactionMetadataAuthorizeDerivedKey;
    if (
      transactionMetadata.derivedPublicKey.toString('hex') !==
      derivedKeyPair.getPublic().encode('hex', true)
    ) {
      return false;
    }
    if (transactionMetadata.expirationBlock !== expirationBlock) {
      return false;
    }
    if (transactionMetadata.operationType !== 1) {
      return false;
    }
    if (
      transactionMetadata.accessSignature.toString('hex') !== accessSignature
    ) {
      return false;
    }

    // Verify the transaction outputs.
    for (const output of transaction.outputs) {
      if (
        output.publicKey.toString('hex') !==
        transaction.publicKey.toString('hex')
      ) {
        return false;
      }
    }
    return true;
  }

  // Public Modifiers

  addUser(
    keychain: HDKey,
    mnemonic: string,
    extraText: string,
    network: Network,
    google?: boolean
  ): string {
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const keyPair = this.cryptoService.seedHexToPrivateKey(seedHex);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(
      keychain,
      network
    );
    const ethDepositAddress = this.cryptoService.publicKeyToEthAddress(keyPair);

    let loginMethod: LoginMethod = LoginMethod.DESO;
    if (google) {
      loginMethod = LoginMethod.GOOGLE;
    }

    return this.addPrivateUser({
      seedHex,
      mnemonic,
      extraText,
      btcDepositAddress,
      ethDepositAddress,
      network,
      loginMethod,
      version: PrivateUserVersion.V2,
    });
  }

  addUserWithDepositAddresses(
    keychain: HDKey,
    mnemonic: string,
    extraText: string,
    network: Network,
    btcDepositAddress: string,
    ethDepositAddress: string,
    loginMethod: LoginMethod,
    publicKeyHex: string
  ): string {
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    return this.addPrivateUser({
      seedHex,
      mnemonic,
      extraText,
      btcDepositAddress,
      ethDepositAddress,
      network,
      loginMethod,
      publicKeyHex,
      version: PrivateUserVersion.V2,
    });
  }

  deleteUser(publicKey: string): void {
    const privateUsers = this.getPrivateUsersRaw();

    delete privateUsers[publicKey];

    this.setPrivateUsersRaw(privateUsers);
  }

  setAccessLevel(
    publicKey: string,
    hostname: string,
    accessLevel: AccessLevel
  ): void {
    const levels = JSON.parse(
      localStorage.getItem(AccountService.levelsStorageKey) || '{}'
    );

    levels[hostname] ||= {};
    levels[hostname][publicKey] = accessLevel;

    localStorage.setItem(
      AccountService.levelsStorageKey,
      JSON.stringify(levels)
    );
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
        const keyPair = this.cryptoService.seedHexToPrivateKey(
          privateUser.seedHex
        );
        privateUser.ethDepositAddress =
          this.cryptoService.publicKeyToEthAddress(keyPair);

        // Increment version
        privateUser.version = PrivateUserVersion.V1;
      }

      // Migrate from V1 -> V2
      if (privateUser.version === PrivateUserVersion.V1) {
        // Add loginMethod field
        if (privateUser.google) {
          privateUser.loginMethod = LoginMethod.GOOGLE;
        } else {
          privateUser.loginMethod = LoginMethod.DESO;
        }

        // Increment version
        privateUser.version = PrivateUserVersion.V2;
      }

      privateUsers[publicKey] = privateUser;
    }

    this.setPrivateUsersRaw(privateUsers);
  }

  getPrivateSharedSecret(ownerPublicKey: string, publicKey: string): string {
    const privateUsers = this.getPrivateUsers();
    if (!(ownerPublicKey in privateUsers)) {
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

    // Metamask login will be added with the master public key.
    let publicKey = this.cryptoService.privateKeyToDeSoPublicKey(
      privateKey,
      userInfo.network
    );
    if (
      userInfo.loginMethod === LoginMethod.METAMASK &&
      userInfo.publicKeyHex
    ) {
      publicKey = this.cryptoService.publicKeyHexToDeSoPublicKey(
        userInfo.publicKeyHex,
        userInfo.network
      );
    }

    privateUsers[publicKey] = userInfo;

    this.setPrivateUsersRaw(privateUsers);

    return publicKey;
  }

  getLoginMethodWithPublicKeyBase58Check(
    publicKeyBase58Check: string
  ): LoginMethod {
    const account = this.getPrivateUsers()[publicKeyBase58Check];
    return account.loginMethod || LoginMethod.DESO;
  }

  private getPrivateUsers(): { [key: string]: PrivateUserInfo } {
    const privateUsers = this.getPrivateUsersRaw();
    const filteredPrivateUsers: { [key: string]: PrivateUserInfo } = {};

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

  private getPrivateUsersRaw(): { [key: string]: PrivateUserInfo } {
    return JSON.parse(
      localStorage.getItem(AccountService.usersStorageKey) || '{}'
    );
  }

  private setPrivateUsersRaw(privateUsers: {
    [key: string]: PrivateUserInfo;
  }): void {
    localStorage.setItem(
      AccountService.usersStorageKey,
      JSON.stringify(privateUsers)
    );
  }
}

import { Injectable } from '@angular/core';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';
import {
  AccessLevel,
  DefaultKeyPrivateInfo,
  DerivedPrivateUserInfo,
  EncryptedMessage,
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
import {
  Transaction,
  TransactionMetadataAuthorizeDerivedKey,
} from '../lib/deso/transaction';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';
import assert from 'assert';
import { MessagingGroup } from './identity.service';
import bs58check from 'bs58check';
import { SwalHelper } from '../lib/helpers/swal-helper';

export const ERROR_USER_NOT_FOUND = 'User not found';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private static USERS_STORAGE_KEY: Readonly<string> = 'users';
  private static LEVELS_STORAGE_KEY: Readonly<string> = 'levels';

  private static publicKeyRegex = /^[a-zA-Z0-9]{54,55}$/;

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService,
    private cookieService: CookieService,
    private entropyService: EntropyService,
    private signingService: SigningService,
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
      let encryptedMessagingKeyRandomness: string | undefined;
      if (privateUser.messagingKeyRandomness) {
        encryptedMessagingKeyRandomness = this.cryptoService.encryptSeedHex(privateUser.messagingKeyRandomness, hostname);
      }
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
        derivedPublicKeyBase58Check: privateUser.derivedPublicKeyBase58Check,
        encryptedMessagingKeyRandomness,
      };
    }

    return publicUsers;
  }

  // Check if the account is signed in via a derived key.
  isMetamaskAccount(userInfo: PublicUserInfo | PrivateUserInfo): boolean {
    return userInfo.loginMethod === LoginMethod.METAMASK;
  }

  getAccessLevel(publicKey: string, hostname: string): AccessLevel {
    if (GlobalVarsService.noAccessHostnames.includes(hostname)) {
      return AccessLevel.None;
    }

    const levels = JSON.parse(
      localStorage.getItem(AccountService.LEVELS_STORAGE_KEY) || '{}'
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
    backendApiService: BackendAPIService,
    publicKeyBase58Check: string,
    blockHeight: number,
    transactionSpendingLimit?: TransactionSpendingLimitResponse,
    derivedPublicKeyBase58CheckInput?: string,
    expirationDays?: number
  ): Promise<DerivedPrivateUserInfo | undefined> {
    if (!(publicKeyBase58Check in this.getPrivateUsers())) {
      return undefined;
    }

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
      response = await backendApiService
        .GetAccessBytes(
          derivedPublicKeyBase58Check,
          expirationBlock,
          actualTransactionSpendingLimit
        )
        .toPromise();
    } catch (e) {
      throw new Error('problem getting spending limit');
    }

    const transactionSpendingLimitHex = response.TransactionSpendingLimitHex;
    let accessBytes: number[] = [
      ...derivedPublicKeyBuffer,
      ...expirationBlockBuffer,
    ];
    if (isMetamask) {
      accessBytes = [...Buffer.from(response.AccessBytesHex, 'hex')];
    } else {
      const transactionSpendingLimitBytes = response.TransactionSpendingLimitHex
        ? [...new Buffer(response.TransactionSpendingLimitHex, 'hex')]
        : [];
      accessBytes.push(...transactionSpendingLimitBytes);
    }
    const accessBytesHex = Buffer.from(accessBytes).toString('hex');
    const accessHash = sha256.x2(accessBytes);

    let accessSignature: string;
    let defaultPrivateKeyInfo: DefaultKeyPrivateInfo;
    if (isMetamask) {
      // TODO: if we want to allow generic log-in with derived keys, we should error because a derived key can't produce a
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

    if (isMetamask && this.globalVars.isMobile()) {
      const swalRes = await SwalHelper.fire({
        target: 'sign-messaging-randomness',
        icon: 'info',
        title: 'Generate Messaging Key',
        html: `Metamask will open and request that you sign a message.
          This is used to generate a key pair that will be used to encrypt and decrypt messages on the DeSo Blockchain`,
        showConfirmButton: true,
        showCancelButton: false,
        allowEscapeKey: false,
        allowOutsideClick: false,
      });
      if (swalRes.isConfirmed) {
        defaultPrivateKeyInfo = await this.getMessagingGroupStandardDerivation(
          publicKeyBase58Check,
          this.globalVars.defaultMessageKeyName
        );
      }
      else {
        throw new Error('Error generating messaging key');
      }
    } else {
      defaultPrivateKeyInfo = await this.getMessagingGroupStandardDerivation(
        publicKeyBase58Check,
        this.globalVars.defaultMessageKeyName
      );
    }

    const {
      messagingPublicKeyBase58Check,
      messagingPrivateKeyHex,
      messagingKeyName,
      messagingKeySignature,
    } = defaultPrivateKeyInfo;
    const messagingPrivateKey = messagingPrivateKeyHex;
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

  getDefaultKeyPrivateUser(publicKey: string, appPublicKey: string): any {
    const privateUser = this.getPrivateUsers()[publicKey];
    const network = privateUser.network;
    // create jwt with private key and app public key
    const keyEncoder = new KeyEncoder('secp256k1');
    const encodedPrivateKey = keyEncoder.encodePrivate(
      privateUser.seedHex,
      'raw',
      'pem'
    );
    const jwt = jsonwebtoken.sign({ appPublicKey }, encodedPrivateKey, {
      algorithm: 'ES256',
      expiresIn: '30 minutes',
    });
    return {
      publicKey,
      appPublicKey,
      network,
      jwt,
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
    publicKeyHex: string,
    derivedPublicKeyBase58Check: string
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
      derivedPublicKeyBase58Check,
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
      localStorage.getItem(AccountService.LEVELS_STORAGE_KEY) || '{}'
    );

    levels[hostname] ||= {};
    levels[hostname][publicKey] = accessLevel;

    localStorage.setItem(
      AccountService.LEVELS_STORAGE_KEY,
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

  getPrivateSharedSecret(
    ownerPublicKeyBase58Check: string,
    publicKey: string
  ): string {
    const privateUsers = this.getPrivateUsers();
    if (!(ownerPublicKeyBase58Check in privateUsers)) {
      return '';
    }
    const seedHex = privateUsers[ownerPublicKeyBase58Check].seedHex;
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBytes = privateKey.getPrivate().toBuffer(undefined, 32);
    const publicKeyBytes = this.cryptoService.publicKeyToECBuffer(publicKey);
    const sharedPx = ecies.derive(privateKeyBytes, publicKeyBytes);
    const sharedPrivateKey = ecies.kdf(sharedPx, 32);
    return sharedPrivateKey.toString('hex');
  }

  async getMessagingGroupStandardDerivation(
    ownerPublicKeyBase58Check: string,
    messagingKeyName: string
  ): Promise<DefaultKeyPrivateInfo> {
    const privateUsers = this.getPrivateUsers();
    if (!(ownerPublicKeyBase58Check in privateUsers)) {
      throw new Error(ERROR_USER_NOT_FOUND);
    }
    const privateUser = privateUsers[ownerPublicKeyBase58Check];
    const seedHex = privateUser.seedHex;
    // Compute messaging private key as sha256x2( sha256x2(secret key) || sha256x2(messageKeyname) )
    let messagingPrivateKeyBuff;
    try {
      messagingPrivateKeyBuff = await this.getMessagingKey(
        privateUser,
        messagingKeyName
      );
    } catch (e) {
      throw new Error(`Problem getting messaging key: ${e}`);
    }
    const messagingPrivateKey = messagingPrivateKeyBuff.toString('hex');
    const ec = new EC('secp256k1');

    // We do this to compress the messaging public key from 65 bytes to 33 bytes.
    const messagingPublicKey = ec
      .keyFromPublic(ecies.getPublic(messagingPrivateKeyBuff), 'array')
      .getPublic(true, 'hex');
    const messagingPublicKeyBase58Check =
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

    let messagingKeySignature = '';
    if (messagingKeyName === this.globalVars.defaultMessageKeyName) {
      messagingKeySignature = this.signingService.signHashes(seedHex, [
        messagingKeyHash,
      ])[0];
    }

    return {
      messagingPublicKeyBase58Check,
      messagingPrivateKeyHex: messagingPrivateKey,
      messagingKeyName,
      messagingKeySignature,
    };
  }

  getMetamaskMessagingKeyRandomnessHex(): string {
    // NOTE due to the cookie check in getMessagingKeyForSeed we should not change the randomness string
    const randomnessString = `Please click sign in order to generate your messaging key.`;
    return Buffer.from(randomnessString, 'utf8').toString('hex');
  }

  getMessagingKeyForSeed(seedHex: string, keyName: string, messagingRandomness: string | undefined): Buffer {
    return this.cryptoService.deriveMessagingKey(messagingRandomness ? messagingRandomness : seedHex, keyName);
  }

  // Compute messaging private key as sha256x2( sha256x2(userSecret) || sha256x2(key name) )
  async getMessagingKey(
    privateUser: PrivateUserInfo,
    keyName: string
  ): Promise<Buffer> {
    let userSecret = privateUser.seedHex;
    if (privateUser.loginMethod === LoginMethod.METAMASK) {
      if (privateUser.messagingKeyRandomness) {
        userSecret = privateUser.messagingKeyRandomness;
      } else {
        const randomnessString = this.getMetamaskMessagingKeyRandomnessHex();
        try {
          await this.metamaskService.connectWallet();
        } catch (e) {
          throw new Error(
            `Can\'t connect to the Metamask API. Error: ${e}. Please try again.`
          );
        }
        try {
          const { message, signature, publicEthAddress } =
            await this.metamaskService.signMessageWithMetamaskAndGetEthAddress(
              randomnessString
            );
          assert(
            signature && publicEthAddress,
            'Failed to get randomness with Metamask'
          );
          const metamaskKeyPair =
            this.metamaskService.getMetaMaskMasterPublicKeyFromSignature(
              signature,
              message
            );
          const metamaskPublicKey = Buffer.from(
            metamaskKeyPair.getPublic().encode('array', true)
          );
          const metamaskPublicKeyHex = metamaskPublicKey.toString('hex');
          const ec = new EC('secp256k1');
          const privateUserPkHex = ec.keyFromPublic(
            privateUser.publicKeyHex as string,
            'hex'
          );
          const properPublicKey =
            this.cryptoService.publicKeyToEthAddress(privateUserPkHex);
          assert(
            metamaskPublicKeyHex === privateUser.publicKeyHex,
            `Wrong account selected in MetaMask,
            requested account: ${properPublicKey}`
          );
          userSecret = sha256.x2([...new Buffer(signature.slice(2), 'hex')]);
          this.addPrivateUser({
            ...privateUser,
            messagingKeyRandomness: userSecret,
          });
        } catch (e) {
          throw e;
        }
      }
    }
    return this.cryptoService.deriveMessagingKey(userSecret, keyName);
  }

  encryptMessage(
    seedHex: string,
    senderGroupKeyName: string,
    recipientPublicKey: string,
    message: string,
    messagingKeyRandomness: string | undefined,
  ): any {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer(undefined, 32);

    const publicKeyBuffer =
      this.cryptoService.publicKeyToECBuffer(recipientPublicKey);
    // Depending on if the senderGroupKeyName parameter was passed, we will determine the private key to use when
    // encrypting the message.
    let privateEncryptionKey = privateKeyBuffer;
    if (senderGroupKeyName) {
      privateEncryptionKey = this.getMessagingKeyForSeed(
        seedHex,
        senderGroupKeyName,
        messagingKeyRandomness,
      );
    }

    // Encrypt the message using keys we determined above.
    const encryptedMessage = ecies.encryptShared(
      privateEncryptionKey,
      publicKeyBuffer,
      message
    );
    return {
      encryptedMessage: encryptedMessage.toString('hex'),
    };
  }

  // Legacy decryption for older clients
  // @param encryptedHexes : string[]
  decryptMessagesLegacy(
    seedHex: string,
    encryptedHexes: any
  ): { [key: string]: any } {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer(undefined, 32);

    const decryptedHexes: { [key: string]: any } = {};
    for (const encryptedHex of encryptedHexes) {
      const encryptedBytes = new Buffer(encryptedHex, 'hex');
      const opts = { legacy: true };
      try {
        decryptedHexes[encryptedHex] = ecies
          .decrypt(privateKeyBuffer, encryptedBytes, opts)
          .toString();
      } catch (e: any) {
        console.error(e);
      }
    }
    return decryptedHexes;
  }

  // Decrypt messages encrypted with shared secret
  async decryptMessages(
    seedHex: string,
    encryptedMessages: EncryptedMessage[],
    messagingGroups: MessagingGroup[],
    messagingKeyRandomness: string | undefined,
    ownerPublicKeyBase58Check: string | undefined,
  ): Promise<{ [key: string]: any }> {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);

    const myPublicKey = ownerPublicKeyBase58Check || this.cryptoService.privateKeyToDeSoPublicKey(privateKey, this.globalVars.network);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer(undefined, 32);
    const decryptedHexes: { [key: string]: any } = {};
    for (const encryptedMessage of encryptedMessages) {
      const publicKey = encryptedMessage.PublicKey;
      const publicKeyBytes = this.cryptoService.publicKeyToECBuffer(publicKey);
      const encryptedBytes = new Buffer(encryptedMessage.EncryptedHex, 'hex');
      // Check if message was encrypted using shared secret or public key method
      if (encryptedMessage.Legacy) {
        // If message was encrypted using public key, check the sender to determine if message is decryptable.
        try {
          if (!encryptedMessage.IsSender) {
            const opts = { legacy: true };
            decryptedHexes[encryptedMessage.EncryptedHex] = ecies
              .decrypt(privateKeyBuffer, encryptedBytes, opts)
              .toString();
          } else {
            decryptedHexes[encryptedMessage.EncryptedHex] = '';
          }
        } catch (e: any) {
          console.error(e);
        }
      } else if (!encryptedMessage.Version || encryptedMessage.Version === 2) {
        try {
          decryptedHexes[encryptedMessage.EncryptedHex] = ecies
            .decryptShared(privateKeyBuffer, publicKeyBytes, encryptedBytes)
            .toString();
        } catch (e: any) {
          console.error(e);
        }
      } else {
        // V3 messages will have Legacy=false and Version=3.
        if (encryptedMessage.Version && encryptedMessage.Version === 3) {
          // DeSo V3 Messages
          let privateEncryptionKey = privateKeyBuffer;
          let publicEncryptionKey = publicKeyBytes;
          let defaultKey = false;
          try {
            // public keys of the group - group messaging public keys.
            // assumption is that we've been added to a group with default key
            // for now. we will fix this later.

            // The DeSo V3 Messages rotating public keys are computed using trapdoor key derivation. To find the
            // private key of a messaging public key, we just need the trapdoor = user's seedHex and the key name.
            // Setting IsSender tells Identity if it should invert sender or recipient public key.
            if (encryptedMessage.IsSender) {
              if (
                encryptedMessage.SenderMessagingGroupKeyName ===
                this.globalVars.defaultMessageKeyName
              ) {
                defaultKey = true;
              }
              publicEncryptionKey = this.cryptoService.publicKeyToECBuffer(
                encryptedMessage.RecipientMessagingPublicKey as string
              );
            } else {
              if (
                encryptedMessage.RecipientMessagingGroupKeyName ===
                this.globalVars.defaultMessageKeyName
              ) {
                defaultKey = true;
              }
              publicEncryptionKey = this.cryptoService.publicKeyToECBuffer(
                encryptedMessage.SenderMessagingPublicKey as string
              );

              // 1. get the right messaging group for this message
              // 2. get our member entry in this group
              // 3. get encrypted key from member entry.
              // 4. decrypt this encrypted key with default key -> this is private encryption key
              if (
                encryptedMessage.RecipientMessagingGroupKeyName !==
                'default-key'
              ) {
                const messagingGroup = messagingGroups.filter((mg) => {
                  return (
                    mg.MessagingGroupKeyName ===
                    encryptedMessage.RecipientMessagingGroupKeyName
                  );
                });
                if (
                  messagingGroup.length === 1 &&
                  messagingGroup[0].MessagingGroupMembers
                ) {
                  const myMessagingGroupMemberEntries =
                    messagingGroup[0].MessagingGroupMembers.filter((mgm) => {
                      return (
                        mgm.GroupMemberPublicKeyBase58Check === myPublicKey
                      );
                    });
                  if (myMessagingGroupMemberEntries.length === 1) {
                    const myMessagingGroupMemberEntry =
                      myMessagingGroupMemberEntries[0];
                    const groupPrivateEncryptionKey =
                      this.getMessagingKeyForSeed(
                        seedHex,
                        myMessagingGroupMemberEntry.GroupMemberKeyName,
                        messagingKeyRandomness,
                      );
                    privateEncryptionKey = this.signingService
                      .decryptGroupMessagingPrivateKeyToMember(
                        groupPrivateEncryptionKey,
                        Buffer.from(
                          myMessagingGroupMemberEntry.EncryptedKey,
                          'hex'
                        )
                      )
                      .getPrivate()
                      .toBuffer(undefined, 32);
                  }
                }
              }
            }

            // Currently, Identity only computes trapdoor public key with name "default-key".
            // Compute messaging private key as sha256x2( sha256x2(secret key) || sha256x2(key name) )
            if (defaultKey) {
              privateEncryptionKey = this.getMessagingKeyForSeed(
                seedHex,
                this.globalVars.defaultMessageKeyName,
                messagingKeyRandomness,
              );
            }
          } catch (e: any) {
            console.error(e);
            continue;
          }
          try {
            // Now decrypt the message based on computed keys.
            decryptedHexes[encryptedMessage.EncryptedHex] = ecies
              .decryptShared(
                privateEncryptionKey,
                publicEncryptionKey,
                encryptedBytes
              )
              .toString();
          } catch (e: any) {
            console.error(e);
          }
        }
      }
    }
    return decryptedHexes;
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
      localStorage.getItem(AccountService.USERS_STORAGE_KEY) || '{}'
    );
  }

  encryptedSeedHexToPublicKeyBase58Check(encryptedSeedHex: string): string {
    return this.seedHexToPublicKeyBase58Check(this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    ));
  }

  seedHexToPublicKeyBase58Check(seedHex: string): string {
    const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
    return this.cryptoService.privateKeyToDeSoPublicKey(
      privateKey,
      this.globalVars.network
    );
  }

  private setPrivateUsersRaw(privateUsers: {
    [key: string]: PrivateUserInfo;
  }): void {
    localStorage.setItem(
      AccountService.USERS_STORAGE_KEY,
      JSON.stringify(privateUsers)
    );
  }
}

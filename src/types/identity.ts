import { TransactionSpendingLimit } from 'src/lib/deso/transaction';

export interface PrivateUserInfo {
  seedHex: string;
  mnemonic: string;
  publicKeyHex?: string;
  extraText: string;
  btcDepositAddress: string;
  ethDepositAddress: string;
  network: Network;
  loginMethod?: LoginMethod;
  version: PrivateUserVersion;
  messagingKeyRandomness?: string;
  derivedPublicKeyBase58Check?: string;

  /** DEPRECATED in favor of loginMethod */
  google?: boolean;
}

export enum ExtraData {
  TransactionSpendingLimit = 'TransactionSpendingLimit',
  DerivedKeyMemo = 'DerivedKeyMemo',
}

export enum PrivateUserVersion {
  // Adds "version"
  V0 = 0,

  // Adds "ethDepositAddress"
  V1 = 1,

  // Adds "loginMethod"
  V2 = 2,
}

export enum LoginMethod {
  DESO = 'DESO',
  GOOGLE = 'GOOGLE',
  METAMASK = 'METAMASK',
}

export interface PublicUserInfo {
  hasExtraText: boolean;
  btcDepositAddress: string;
  ethDepositAddress: string;
  encryptedSeedHex: string;
  network: Network;
  accessLevel: AccessLevel;
  accessLevelHmac: string;
  loginMethod?: LoginMethod;
  version: PrivateUserVersion;
  derivedPublicKeyBase58Check?: string;
}

export interface DerivedPrivateUserInfo {
  derivedSeedHex: string;
  derivedPublicKeyBase58Check: string;
  publicKeyBase58Check: string;
  btcDepositAddress: string;
  ethDepositAddress: string;
  expirationBlock: number;
  network: Network;
  accessSignature: string;
  jwt: string;
  derivedJwt: string;
  messagingPublicKeyBase58Check: string;
  messagingPrivateKey: string;
  messagingKeyName: string;
  messagingKeySignature: string;
  transactionSpendingLimitHex: string | undefined;
  signedUp: boolean;
}

export interface DefaultKeyPrivateInfo {
  messagingPublicKeyBase58Check: string;
  messagingPrivateKeyHex: string;
  messagingKeyName: string;
  messagingKeySignature: string;
}

export interface UserProfile {
  username: string;
  profilePic: any;
}

export interface DerivedKey {
  derivedPublicKeyBase58Check: string;
  ownerPublicKeyBase58Check: string;
  expirationBlock: number;
  isValid: boolean;
  transactionSpendingLimit?: TransactionSpendingLimit | null;
}

export interface EncryptedMessage {
  EncryptedHex: string;
  PublicKey: string;
  IsSender: boolean;
  Legacy: boolean;
  Version?: number;
  SenderMessagingPublicKey?: string;
  SenderMessagingGroupKeyName?: string;
  RecipientMessagingPublicKey?: string;
  RecipientMessagingGroupKeyName?: string;
}

export enum Network {
  mainnet = 'mainnet',
  testnet = 'testnet',
}

export enum AccessLevel {
  // User revoked permissions
  None = 0,

  // Unused
  Unused = 1,

  // Approval required for all transactions
  ApproveAll = 2,

  // Approval required for buys, sends, and sells
  ApproveLarge = 3,

  // Node can sign all transactions without approval
  Full = 4,
}

export interface GoogleAuthState {
  testnet: boolean;
  webview: boolean;
  jumio: boolean;
  callback: string;
  derive: boolean;
  getFreeDeso: boolean;
  signedUp: boolean;
}

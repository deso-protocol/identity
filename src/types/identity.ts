import { TransactionSpendingLimit } from 'src/lib/deso/transaction';

export interface AccountMetadata {
  isHidden?: boolean;
  lastLoginTimestamp?: number;
}

export interface SubAccountMetadata extends AccountMetadata {
  accountNumber: number;
}

export interface PrivateUserInfo extends AccountMetadata {
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
  /**
   * This is a list of the account numbers that this user has used to generate
   * sub-accounts.  An account number plus the parent account seed is enough to
   * generate or recover a unique sub-account.
   */
  subAccounts?: SubAccountMetadata[];

  /**
   * Determines whether we display the "Back up your seed" button in the UI.  We
   * show it by default for all users, but we hide it for users who have
   * explicitly disabled it.
   */
  exportDisabled?: boolean;

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
  encryptedMessagingKeyRandomness?: string;
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
  balanceNanos: number;
}

export type Account = UserProfile & {
  publicKey: string;
  accountNumber: number;
};
export type ParentAccount = Account & { subAccounts: Account[] };

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
  transactionSpendingLimitResponse: string;
  deleteKey: boolean;
  derivedPublicKey: string;
  expirationDays: number;
  redirect_uri?: string;
  showSkip: boolean;
}

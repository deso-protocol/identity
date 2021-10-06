export interface PrivateUserInfo {
  seedHex: string;
  mnemonic: string;
  extraText: string;
  btcDepositAddress: string;
  ethDepositAddress: string;
  network: Network;
  google?: boolean;
  version: PrivateUserVersion;
}

export enum PrivateUserVersion {
  // Adds "version"
  V0 = 0,

  // Adds "ethDepositAddress"
  V1 = 1,
}

export interface PublicUserInfo {
  hasExtraText: boolean;
  btcDepositAddress: string;
  ethDepositAddress: string;
  encryptedSeedHex: string;
  network: Network;
  accessLevel: AccessLevel;
  accessLevelHmac: string;
  version: PrivateUserVersion;
}

export interface DerivedPrivateUserInfo {
  derivedSeedHex: string;
  derivedPublicKey: string;
  publicKey: string;
  btcDepositAddress: string;
  ethDepositAddress: string;
  expirationBlock: number;
  network: Network;
  accessSignature: string;
  jwt: string;
  derivedJwt: string;
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
}

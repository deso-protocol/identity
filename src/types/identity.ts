export interface PrivateUserInfo {
  seedHex: string;
  mnemonic: string;
  extraText: string;
  btcDepositAddress: string;
  network: Network;
  google?: boolean;
}

export interface PublicUserInfo {
  hasExtraText: boolean;
  btcDepositAddress: string;
  encryptedSeedHex: string;
  network: Network;
  accessLevel: AccessLevel;
  accessLevelHmac: string;
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

export interface PrivateUserInfo {
  seedHex: string;
  mnemonic: string;
  extraText: string;
  btcDepositAddress: string;
  network: Network;
}

export interface PublicUserInfo {
  hasExtraText: boolean;
  btcDepositAddress: string;
  encryptedSeedHex: string;
  network: Network;
  accessLevel: AccessLevel;
}

export enum Network {
  mainnet = 'mainnet',
  testnet = 'testnet',
}

export enum AccessLevel {
  None = 0,
  ReadOnly = 1,
  ApproveAll = 2,
  ApproveLarge = 3,
  Full = 4,
}

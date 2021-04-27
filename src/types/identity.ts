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
  accessLevelHmac: string;
}

export enum Network {
  mainnet = 'mainnet',
  testnet = 'testnet',
}

export enum AccessLevel {
  // User revoked permissions
  None = 0,

  // Node can prove identity (using JWT token)
  Identity = 1,

  // Node can prove identity and decrypt messages
  Messages = 2,

  // Node can prove identity, decrypt messages, and sign small transactions without approval:
  // Like, Post, Follow, Update Profile
  SignSmall = 3,

  // Node can sign all transactions without approval
  Full = 4,
}

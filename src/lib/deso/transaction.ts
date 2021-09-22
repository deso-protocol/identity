import { BinaryRecord, Transcode } from '../bindata';
import { ArrayOf, Boolean, ChunkBuffer, Enum, FixedBuffer, Record, Uint8, Uvarint64, VarBuffer } from '../bindata/transcoders';

export class TransactionInput extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  id: Buffer = Buffer.alloc(0)

  @Transcode(Uvarint64)
  index: number = 0;
}

export class TransactionOutput extends BinaryRecord  {
  @Transcode(FixedBuffer(33))
  publicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  amountNanos: number = 0;
}

export class TransactionExtraDataKV extends BinaryRecord {
  @Transcode(VarBuffer)
  key: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  value: Buffer = Buffer.alloc(0);
}

export class TransactionExtraData extends BinaryRecord {
  @Transcode(ArrayOf(TransactionExtraDataKV))
  kvs: TransactionInput[] = [];
}

export class TransactionMetadataBlockReward extends BinaryRecord {
  @Transcode(VarBuffer)
  extraData: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataBasicTransfer extends BinaryRecord {}

export class TransactionMetadataBitcoinExchange extends BinaryRecord {
  @Transcode(VarBuffer)
  transaction: Buffer = Buffer.alloc(0);

  @Transcode(FixedBuffer(32))
  blockHash: Buffer = Buffer.alloc(0);

  @Transcode(FixedBuffer(32))
  merkleRoot: Buffer = Buffer.alloc(0);

  @Transcode(ChunkBuffer(33))
  merkleProof: Buffer[] = [];
}

export class TransactionMetadataPrivateMessage extends BinaryRecord {
  @Transcode(FixedBuffer(33))
  recipientPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedText: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  timestampNanos: number = 0;
}

export class TransactionMetadataSubmitPost extends BinaryRecord {
  @Transcode(VarBuffer)
  postHashToModify: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  parentStakeId: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  body: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  creatorBasisPoints: number = 0;

  @Transcode(Uvarint64)
  stakeMultipleBasisPoints: number = 0;

  @Transcode(Uvarint64)
  timestampNanos: number = 0;

  @Transcode(Boolean)
  isHidden: boolean = false;
}

export class TransactionMetadataUpdateProfile extends BinaryRecord {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  newUsername: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  newDescription: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  newProfilePic: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  newCreatorBasisPoints: number = 0;

  @Transcode(Uvarint64)
  newStakeMultipleBasisPoints: number = 0;

  @Transcode(Boolean)
  isHidden: boolean = false;
}

export class TransactionMetadataUpdateBitcoinUSDExchangeRate extends BinaryRecord {
  @Transcode(Uvarint64)
  usdCentsPerBitcoin: number = 0;
}

export class TransactionMetadataFollow extends BinaryRecord {
  @Transcode(FixedBuffer(33))
  followedPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Boolean)
  isUnfollow: boolean = false;
}

export class TransactionMetadataLike extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  likedPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Boolean)
  isUnlike: boolean = false;
}

export class TransactionMetadataCreatorCoin extends BinaryRecord {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uint8)
  operationType: number = 0;

  @Transcode(Uvarint64)
  desoToSellNanos: number = 0;

  @Transcode(Uvarint64)
  creatorCoinToSellNanos: number = 0;

  @Transcode(Uvarint64)
  desoToAddNanos: number = 0;

  @Transcode(Uvarint64)
  minDeSoExpectedNanos: number = 0;

  @Transcode(Uvarint64)
  minCreatorCoinExpectedNanos: number = 0;
}

export class TransactionMetadataSwapIdentity extends BinaryRecord {
  @Transcode(VarBuffer)
  fromPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  toPublicKey: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataUpdateGlobalParams extends BinaryRecord {}

export class TransactionMetadataCreatorCoinTransfer extends BinaryRecord {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  creatorCoinToTransferNanos = 0;

  @Transcode(VarBuffer)
  receiverPublicKey: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataCreateNFT extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  numCopies = 0;

  @Transcode(Boolean)
  hasUnlockable: boolean = false;

  @Transcode(Boolean)
  isForSale: boolean = false;

  @Transcode(Uvarint64)
  nftRoyaltyToCreatorBasisPoints = 0;

  @Transcode(Uvarint64)
  nftRoyaltyToCoinBasisPoints = 0;
}

export class TransactionMetadataUpdateNFT extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(Boolean)
  isForSale: boolean = false;

  @Transcode(Uvarint64)
  minBidAmountNanos: number = 0;
}

export class TransactionMetadataAcceptNFTBid extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(VarBuffer)
  bidderPKID: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  bidAmountNanos: number = 0;

  @Transcode(VarBuffer)
  encryptedUnlockableText: Buffer = Buffer.alloc(0);

  @Transcode(ArrayOf(TransactionInput))
  bidderInputs: TransactionInput[] = [];
}

export class TransactionMetadataNFTBid extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(Uvarint64)
  bidAmountNanos: number = 0;
}

export class TransactionMetadataNFTTransfer extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(VarBuffer)
  receiverPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedUnlockableText: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataAcceptNFTTransfer extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;
}

export class TransactionMetadataBurnNFT extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;
}

export class TransactionMetadataAuthorizeDerivedKey extends BinaryRecord {
  @Transcode(VarBuffer)
  derivedPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  expirationBlock: number = 0;

  @Transcode(Uint8)
  operationType: number = 0;

  @Transcode(VarBuffer)
  accessSignature: Buffer = Buffer.alloc(0);
}

export const TransactionTypeMetadataMap = {
  1: TransactionMetadataBlockReward,
  2: TransactionMetadataBasicTransfer,
  3: TransactionMetadataBitcoinExchange,
  4: TransactionMetadataPrivateMessage,
  5: TransactionMetadataSubmitPost,
  6: TransactionMetadataUpdateProfile,
  8: TransactionMetadataUpdateBitcoinUSDExchangeRate,
  9: TransactionMetadataFollow,
  10: TransactionMetadataLike,
  11: TransactionMetadataCreatorCoin,
  12: TransactionMetadataSwapIdentity,
  13: TransactionMetadataUpdateGlobalParams,
  14: TransactionMetadataCreatorCoinTransfer,
  15: TransactionMetadataCreateNFT,
  16: TransactionMetadataUpdateNFT,
  17: TransactionMetadataAcceptNFTBid,
  18: TransactionMetadataNFTBid,
  19: TransactionMetadataNFTTransfer,
  20: TransactionMetadataAcceptNFTTransfer,
  21: TransactionMetadataBurnNFT,
  22: TransactionMetadataAuthorizeDerivedKey,
};

export class Transaction<T> extends BinaryRecord {
  @Transcode(ArrayOf(TransactionInput))
  inputs: TransactionInput[] = [];

  @Transcode(ArrayOf(TransactionOutput))
  outputs: TransactionOutput[] = [];

  @Transcode(Enum(TransactionTypeMetadataMap))
  metadata: T | null = null;

  @Transcode(VarBuffer)
  publicKey: Buffer = Buffer.alloc(0);

  @Transcode(Record(TransactionExtraData))
  extraData: TransactionExtraData | null = null;

  @Transcode(VarBuffer)
  signature: Buffer | null = null;
}

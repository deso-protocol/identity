import { BinaryRecord, Transcode } from '../bindata';
import {
  ArrayOf,
  Boolean,
  BoolOptional,
  ChunkBuffer,
  Enum,
  FixedBuffer,
  Optional,
  Record,
  TransactionNonceTranscoder,
  Uint8,
  Uvarint64,
  VarBuffer,
  VarBufferArray,
  Varint64,
} from '../bindata/transcoders';

export class TransactionInput extends BinaryRecord {
  @Transcode(FixedBuffer(32))
  id: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  index: number = 0;
}

export class TransactionOutput extends BinaryRecord {
  @Transcode(FixedBuffer(33))
  publicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  amountNanos: number = 0;
}

export class TransactionNonce extends BinaryRecord {
  @Transcode(Uvarint64)
  expirationBlockHeight: number = 0;

  @Transcode(Uvarint64)
  partialId: number = 0;
}

export class TransactionExtraDataKV extends BinaryRecord {
  @Transcode(VarBuffer)
  key: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  value: Buffer = Buffer.alloc(0);
}

export class TransactionExtraData extends BinaryRecord {
  @Transcode(ArrayOf(TransactionExtraDataKV))
  kvs: TransactionExtraDataKV[] = [];
}
export abstract class TransactionMetadata extends BinaryRecord {}

export class TransactionMetadataBlockReward extends TransactionMetadata {
  @Transcode(VarBuffer)
  extraData: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataBasicTransfer extends TransactionMetadata {}

export class TransactionMetadataBitcoinExchange extends TransactionMetadata {
  @Transcode(VarBuffer)
  transaction: Buffer = Buffer.alloc(0);

  @Transcode(FixedBuffer(32))
  blockHash: Buffer = Buffer.alloc(0);

  @Transcode(FixedBuffer(32))
  merkleRoot: Buffer = Buffer.alloc(0);

  @Transcode(ChunkBuffer(33))
  merkleProof: Buffer[] = [];
}

export class TransactionMetadataPrivateMessage extends TransactionMetadata {
  @Transcode(FixedBuffer(33))
  recipientPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedText: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  timestampNanos: number = 0;
}

export class TransactionMetadataSubmitPost extends TransactionMetadata {
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

export class TransactionMetadataUpdateProfile extends TransactionMetadata {
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

export class TransactionMetadataUpdateBitcoinUSDExchangeRate extends TransactionMetadata {
  @Transcode(Uvarint64)
  usdCentsPerBitcoin: number = 0;
}

export class TransactionMetadataFollow extends TransactionMetadata {
  @Transcode(FixedBuffer(33))
  followedPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Boolean)
  isUnfollow: boolean = false;
}

export class TransactionMetadataLike extends TransactionMetadata {
  @Transcode(FixedBuffer(32))
  likedPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Boolean)
  isUnlike: boolean = false;
}

export class TransactionMetadataCreatorCoin extends TransactionMetadata {
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

export class TransactionMetadataSwapIdentity extends TransactionMetadata {
  @Transcode(VarBuffer)
  fromPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  toPublicKey: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataUpdateGlobalParams extends TransactionMetadata {}

export class TransactionMetadataCreatorCoinTransfer extends TransactionMetadata {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  creatorCoinToTransferNanos = 0;

  @Transcode(VarBuffer)
  receiverPublicKey: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataCreateNFT extends TransactionMetadata {
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

export class TransactionMetadataUpdateNFT extends TransactionMetadata {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(Boolean)
  isForSale: boolean = false;

  @Transcode(Uvarint64)
  minBidAmountNanos: number = 0;
}

export class TransactionMetadataAcceptNFTBid extends TransactionMetadata {
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

export class TransactionMetadataNFTBid extends TransactionMetadata {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(Uvarint64)
  bidAmountNanos: number = 0;
}

export class TransactionMetadataNFTTransfer extends TransactionMetadata {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(VarBuffer)
  receiverPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedUnlockableText: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataAcceptNFTTransfer extends TransactionMetadata {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;
}

export class TransactionMetadataBurnNFT extends TransactionMetadata {
  @Transcode(FixedBuffer(32))
  nftPostHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;
}

export class TransactionMetadataAuthorizeDerivedKey extends TransactionMetadata {
  @Transcode(VarBuffer)
  derivedPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  expirationBlock: number = 0;

  @Transcode(Uint8)
  operationType: number = 0;

  @Transcode(VarBuffer)
  accessSignature: Buffer = Buffer.alloc(0);
}

export class MessagingGroupMember extends BinaryRecord {
  @Transcode(VarBuffer)
  groupMemberPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  groupMemberKeyName: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedKey: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataMessagingGroup extends BinaryRecord {
  @Transcode(VarBuffer)
  messagingPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  messagingGroupKeyName: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  groupOwnerSignature: Buffer = Buffer.alloc(0);

  @Transcode(ArrayOf(MessagingGroupMember))
  messagingGroupMembers: MessagingGroupMember[] = [];
}

export class TransactionMetadataDAOCoin extends TransactionMetadata {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uint8)
  operationType: number = 0;

  @Transcode(VarBuffer)
  coinsToMintNanos: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  coinsToBurnNanos: Buffer = Buffer.alloc(0);

  @Transcode(Uint8)
  transferRestrictionStatus: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataTransferDAOCoin extends TransactionMetadata {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  daoCoinToTransferNanos: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  receiverPublicKey: Buffer = Buffer.alloc(0);
}

export class TransactionCountLimitMapItem extends BinaryRecord {
  @Transcode(Uint8)
  txnType: number = 0;

  @Transcode(Uvarint64)
  value: number = 0;
}

export class TransactionCountLimitMap extends BinaryRecord {
  @Transcode(ArrayOf(TransactionCountLimitMapItem))
  txnCountLimitMap: TransactionCountLimitMapItem[] = [];
}

export class TransactionCoinOperationLimitMapItem extends BinaryRecord {
  @Transcode(VarBuffer)
  creatorPKID: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  operation: number = 0;

  @Transcode(Uvarint64)
  value: number = 0;
}

export class TransactionCoinOperationLimitMap extends BinaryRecord {
  @Transcode(ArrayOf(TransactionCoinOperationLimitMapItem))
  coinOperationLimitMap: TransactionCoinOperationLimitMap[] = [];
}

export class TransactionNFTOperationLimitMapItem extends BinaryRecord {
  @Transcode(VarBuffer)
  postHash: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  serialNumber: number = 0;

  @Transcode(Uvarint64)
  operation: number = 0;

  @Transcode(Uvarint64)
  value: number = 0;
}

export class TransactionNFTOperationLimitMap extends BinaryRecord {
  @Transcode(ArrayOf(TransactionNFTOperationLimitMapItem))
  coinOperationLimitMap: TransactionNFTOperationLimitMap[] = [];
}

export class TransactionDAOCoinLimitOrderLimitMapItem extends BinaryRecord {
  @Transcode(VarBuffer)
  buyingDAOCoinCreatorPKID: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  sellingDAOCoinCreatorPKID: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  value: number = 0;
}

// TODO: does this need to be updated? Where is it really used?
export class TransactionSpendingLimit extends BinaryRecord {
  @Transcode(Uvarint64)
  globalDESOLimit: number = 0;

  @Transcode(ArrayOf(TransactionCountLimitMapItem))
  txnCountLimitMap: TransactionCountLimitMapItem[] = [];

  @Transcode(ArrayOf(TransactionCoinOperationLimitMapItem))
  creatorCoinOperationLimitMap: TransactionCoinOperationLimitMapItem[] = [];

  @Transcode(ArrayOf(TransactionCoinOperationLimitMapItem))
  daoCoinOperationLimitMap: TransactionCoinOperationLimitMapItem[] = [];

  @Transcode(ArrayOf(TransactionNFTOperationLimitMapItem))
  nftOperationLimitMap: TransactionNFTOperationLimitMapItem[] = [];

  @Transcode(ArrayOf(TransactionDAOCoinLimitOrderLimitMapItem))
  daoCoinLimitOrderLimitMap: TransactionDAOCoinLimitOrderLimitMapItem[] = [];
}

export class DeSoInputsByTransactor extends BinaryRecord {
  @Transcode(FixedBuffer(33))
  transactorPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(ArrayOf(TransactionInput))
  inputs: TransactionInput[] = [];
}

export class TransactionMetadataDAOCoinLimitOrder extends BinaryRecord {
  @Transcode(VarBuffer)
  buyingDAOCoinCreatorPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  sellingDAOCoinCreatorPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  scaledExchangeRateCoinsToSellPerCoinToBuy: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  quantityToFillInBaseUnits: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  operationType: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  fillType: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  cancelOrderID: Buffer = Buffer.alloc(0);

  @Transcode(ArrayOf(DeSoInputsByTransactor))
  bidderInputs: DeSoInputsByTransactor[] = [];
}

export class TransactionMetadataCreateUserAssociation extends BinaryRecord {
  @Transcode(VarBuffer)
  targetUserPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  appPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  associationType: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  associationValue: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataDeleteUserAssociation extends BinaryRecord {
  @Transcode(VarBuffer)
  associationID: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataCreatePostAssociation extends BinaryRecord {
  @Transcode(VarBuffer)
  postHash: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  appPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  associationType: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  associationValue: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataDeletePostAssociation extends BinaryRecord {
  @Transcode(VarBuffer)
  associationID: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataAccessGroup extends BinaryRecord {
  @Transcode(VarBuffer)
  accessGroupOwnerPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  accessGroupPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  accessGroupKeyName: Buffer = Buffer.alloc(0);

  @Transcode(Uint8)
  accessGroupOperationType: number = 0;
}

export class AccessGroupMember extends BinaryRecord {
  @Transcode(VarBuffer)
  accessGroupMemberPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  accessGroupMemberKeyName: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedKey: Buffer = Buffer.alloc(0);

  @Transcode(Record(TransactionExtraData))
  extraData: TransactionExtraData | null = null;
}

export class TransactionMetadataAccessGroupMembers extends BinaryRecord {
  @Transcode(VarBuffer)
  accessGroupOwnerPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  accessGroupKeyName: Buffer = Buffer.alloc(0);

  @Transcode(ArrayOf(AccessGroupMember))
  accessGroupMembersList: AccessGroupMember[] = [];

  @Transcode(Uint8)
  accessGroupMemberOperationType: number = 0;
}

export class TransactionMetadataNewMessage extends BinaryRecord {
  @Transcode(VarBuffer)
  senderAccessGroupOwnerPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  senderAccessGroupKeyName: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  senderAccessGroupPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  recipientAccessGroupOwnerPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  recipientAccessGroupKeyname: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  recipientAccessGroupPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  encryptedText: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  timestampNanos: number = 0;

  @Transcode(Uint8)
  newMessageType: number = 0;

  @Transcode(Uint8)
  newMessageOperation: number = 0;
}

export class TransactionMetadataRegisterAsValidator extends TransactionMetadata {
  @Transcode(VarBufferArray)
  domains: Buffer[] = [];

  @Transcode(Boolean)
  disableDelegatedStake: boolean = false;

  @Transcode(Uvarint64)
  delegatedStakeCommissionBasisPoints: number = 0;

  // TODO: Technically this is a bls public key,
  // but under the hood it's really just a byte array.
  // The challenge is converting this into something human
  // readable in the UI.
  @Transcode(VarBuffer)
  votingPublicKey: Buffer = Buffer.alloc(0);

  // TODO: Technically this is a bls signature,
  // but under the hood it's really just a byte array.
  // The challenge is converting this into something human
  // readable in the UI.
  @Transcode(VarBuffer)
  votingAuthorization: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataUnregisterAsValidator extends TransactionMetadata {}

export class TransactionMetadataStake extends TransactionMetadata {
  @Transcode(VarBuffer)
  validatorPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uint8)
  rewardMethod: number = 0;

  // TODO: We may want a better way to handle uint256s.
  @Transcode(BoolOptional(VarBuffer))
  stakeAmountNanos: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataUnstake extends TransactionMetadata {
  @Transcode(VarBuffer)
  validatorPublicKey: Buffer = Buffer.alloc(0);

  // TODO: We may want a better way to handle uint256s.
  @Transcode(BoolOptional(VarBuffer))
  unstakeAmountNanos: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataUnlockStake extends TransactionMetadata {
  @Transcode(VarBuffer)
  validatorPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Uvarint64)
  startEpochNumber: number = 0;

  @Transcode(Uvarint64)
  endEpochNumber: number = 0;
}

export class TransactionMetadataUnjailValidator extends TransactionMetadata {}

export class TransactionMetadataCoinLockup extends TransactionMetadata {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  recipientPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Varint64)
  unlockTimestampNanoSecs: number = 0;

  @Transcode(Varint64)
  vestingEndTimestampNanoSecs: number = 0;

  // TODO: We may want a better way to handle uint256s.
  @Transcode(BoolOptional(VarBuffer))
  lockupAmountBaseUnits: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataUpdateCoinLockupParams extends TransactionMetadata {
  @Transcode(Varint64)
  lockupYieldDurationNanoSecs: number = 0;

  @Transcode(Uvarint64)
  lockupYieldAPYBasisPoints: number = 0;

  @Transcode(Boolean)
  removeYieldCurvePoint: boolean = false;

  @Transcode(Boolean)
  newLockupTransferRestrictions: boolean = false;

  @Transcode(Uint8)
  lockupTransferRestrictionStatus: number = 0;
}

export class TransactionMetadataCoinLockupTransfer extends TransactionMetadata {
  @Transcode(VarBuffer)
  recipientPublicKey: Buffer = Buffer.alloc(0);

  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);

  @Transcode(Varint64)
  unlockTimestampNanoSecs: number = 0;

  // TODO: We may want a better way to handle uint256s.
  @Transcode(BoolOptional(VarBuffer))
  lockedCoinsToTransferBaseUnits: Buffer = Buffer.alloc(0);
}

export class TransactionMetadataCoinUnlock extends TransactionMetadata {
  @Transcode(VarBuffer)
  profilePublicKey: Buffer = Buffer.alloc(0);
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
  23: TransactionMetadataMessagingGroup,
  24: TransactionMetadataDAOCoin,
  25: TransactionMetadataTransferDAOCoin,
  26: TransactionMetadataDAOCoinLimitOrder,
  27: TransactionMetadataCreateUserAssociation,
  28: TransactionMetadataDeleteUserAssociation,
  29: TransactionMetadataCreatePostAssociation,
  30: TransactionMetadataDeletePostAssociation,
  31: TransactionMetadataAccessGroup,
  32: TransactionMetadataAccessGroupMembers,
  33: TransactionMetadataNewMessage,
  34: TransactionMetadataRegisterAsValidator,
  35: TransactionMetadataUnregisterAsValidator,
  36: TransactionMetadataStake,
  37: TransactionMetadataUnstake,
  38: TransactionMetadataUnlockStake,
  39: TransactionMetadataUnjailValidator,
  40: TransactionMetadataCoinLockup,
  41: TransactionMetadataUpdateCoinLockupParams,
  42: TransactionMetadataCoinLockupTransfer,
  43: TransactionMetadataCoinUnlock,
};

export class Transaction extends BinaryRecord {
  @Transcode(ArrayOf(TransactionInput))
  inputs: TransactionInput[] = [];

  @Transcode(ArrayOf(TransactionOutput))
  outputs: TransactionOutput[] = [];

  @Transcode(Enum(TransactionTypeMetadataMap))
  metadata: TransactionMetadata | null = null;

  @Transcode(VarBuffer)
  publicKey: Buffer = Buffer.alloc(0);

  @Transcode(Record(TransactionExtraData))
  extraData: TransactionExtraData | null = null;

  @Transcode(VarBuffer)
  signature: Buffer | null = null;

  // TODO: figure out how to deal with versioning. I don't LOVE
  // this optional field, but it's the best I can think of for now.
  @Transcode(Optional(Uvarint64))
  version: number = 0;

  @Transcode(Optional(Uvarint64))
  feeNanos: number = 0;

  @Transcode(Optional(TransactionNonceTranscoder))
  nonce: TransactionNonce | null = null;
}

export class TransactionV0 extends BinaryRecord {
  @Transcode(ArrayOf(TransactionInput))
  inputs: TransactionInput[] = [];

  @Transcode(ArrayOf(TransactionOutput))
  outputs: TransactionOutput[] = [];

  @Transcode(Enum(TransactionTypeMetadataMap))
  metadata: TransactionMetadata | null = null;

  @Transcode(VarBuffer)
  publicKey: Buffer = Buffer.alloc(0);

  @Transcode(Record(TransactionExtraData))
  extraData: TransactionExtraData | null = null;

  @Transcode(VarBuffer)
  signature: Buffer | null = null;
}

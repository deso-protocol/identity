import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { logInteractionEvent } from 'src/app/interaction-event-helpers';
import { environment } from '../environments/environment';
import { DerivedKey, Network, UserProfile } from '../types/identity';
import { AccountService } from './account.service';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';
import { SigningService } from './signing.service';

export interface MetamaskSignInRequest {
  AmountNanos: number;
  Signer: number[];
  Message: number[];
  Signature: number[];
}

export interface MetamaskSignInResponse {
  TxnHash: string;
}

export class ProfileEntryResponse {
  Username: string | null = null;
  Description: string | null = null;
  ProfilePic?: string;
  CoinEntry?: {
    DeSoLockedNanos: number;
    CoinWatermarkNanos: number;
    CoinsInCirculationNanos: number;
    CreatorBasisPoints: number;
  };
  CoinPriceDeSoNanos?: number;
  StakeMultipleBasisPoints?: number;
  PublicKeyBase58Check?: string;
  UsersThatHODL?: any;
  Posts?: any[];
  IsReserved?: boolean;
  IsVerified?: boolean;
}

export class PostEntryReaderState {
  // This is true if the reader has liked the associated post.
  LikedByReader?: boolean;

  // This is true if the reader has reposted the associated post.
  RepostedByReader?: boolean;

  // This is the post hash hex of the repost
  RepostPostHashHex?: string;

  // Level of diamond the user gave this post.
  DiamondLevelBestowed?: number;
}

export type PostEntryResponse = {
  PostHashHex: string;
  PosterPublicKeyBase58Check: string;
  ParentStakeID: string;
  Body: string;
  RepostedPostHashHex: string;
  ImageURLs: string[];
  VideoURLs: string[];
  RepostPost: PostEntryResponse;
  CreatorBasisPoints: number;
  StakeMultipleBasisPoints: number;
  TimestampNanos: number;
  IsHidden: boolean;
  ConfirmationBlockHeight: number;
  // PostEntryResponse of the post that this post reposts.
  RepostedPostEntryResponse: PostEntryResponse;
  // The profile associated with this post.
  ProfileEntryResponse?: ProfileEntryResponse;
  // The comments associated with this post.
  Comments: PostEntryResponse[];
  LikeCount: number;
  RepostCount: number;
  QuoteRepostCount: number;
  DiamondCount: number;
  // Information about the reader's state w/regard to this post (e.g. if they liked it).
  PostEntryReaderState?: PostEntryReaderState;
  // True if this post hash hex is in the global feed.
  InGlobalFeed: boolean;
  CommentCount: number;
  // A list of parent posts for this post (ordered: root -> closest parent post).
  ParentPosts: PostEntryResponse[];
  InMempool: boolean;
  IsPinned: boolean;
  DiamondsFromSender?: number;
  NumNFTCopies: number;
  NumNFTCopiesForSale: number;
  HasUnlockable: boolean;
  IsNFT: boolean;
  NFTRoyaltyToCoinBasisPoints: number;
  NFTRoyaltyToCreatorBasisPoints: number;
  AdditionalDESORoyaltiesMap: { [k: string]: number };
  AdditionalCoinRoyaltiesMap: { [k: string]: number };
};

export class User {
  ProfileEntryResponse: ProfileEntryResponse | null = null;
  PublicKeyBase58Check = '';
  HasPhoneNumber: boolean | null = null;
  BalanceNanos = 0;
  UsersYouHODL: any[] = [];
}

type CountryLevelSignUpBonus = {
  AllowCustomReferralAmount: boolean;
  ReferralAmountOverrideUSDCents: number;
  AllowCustomKickbackAmount: boolean;
  KickbackAmountOverrideUSDCents: number;
};

export enum CreatorCoinLimitOperationString {
  ANY = 'any',
  BUY = 'buy',
  SELL = 'sell',
  TRANSFER = 'transfer',
}

export enum DAOCoinLimitOperationString {
  ANY = 'any',
  MINT = 'mint',
  BURN = 'burn',
  DISABLE_MINTING = 'disable_minting',
  UPDATE_TRANSFER_RESTRICTION_STATUS = 'update_transfer_restriction_status',
  TRANSFER = 'transfer',
}

export type CoinLimitOperationString =
  | DAOCoinLimitOperationString
  | CreatorCoinLimitOperationString;

export type CoinOperationLimitMap<T extends CoinLimitOperationString> = {
  [publicKey: string]: OperationToCountMap<T>;
};

export type OperationToCountMap<T extends LimitOperationString> = {
  [operation in T]?: number;
};

export type LimitOperationString =
  | DAOCoinLimitOperationString
  | CreatorCoinLimitOperationString
  | NFTLimitOperationString
  | AssociationOperationString
  | AccessGroupOperationString
  | AccessGroupMemberOperationString
  | LockupLimitOperationString;
export type CreatorCoinOperationLimitMap =
  CoinOperationLimitMap<CreatorCoinLimitOperationString>;
export type DAOCoinOperationLimitMap =
  CoinOperationLimitMap<DAOCoinLimitOperationString>;
export type DAOCoinLimitOrderLimitMap = {
  [buyingPublicKey: string]: { [sellingPublicKey: string]: number };
};
export type DAOCoinLimitOrderLimitItem = {
  BuyingPublicKey: string;
  SellingPublicKey: string;
  OpCount: number;
};

export enum NFTLimitOperationString {
  ANY = 'any',
  UPDATE = 'update',
  BID = 'nft_bid',
  ACCEPT_BID = 'accept_nft_bid',
  TRANSFER = 'transfer',
  BURN = 'burn',
  ACCEPT_TRANSFER = 'accept_nft_transfer',
}

export type NFTOperationLimitMap = {
  [postHashHex: string]: {
    [serialNumber: number]: OperationToCountMap<NFTLimitOperationString>;
  };
};

export enum AssociationClass {
  USER = 'User',
  POST = 'Post',
}

export enum AssociationAppScopeType {
  ANY = 'Any',
  SCOPED = 'Scoped',
}

export enum AssociationOperationString {
  ANY = 'Any',
  CREATE = 'Create',
  DELETE = 'Delete',
}

export type AssociationLimitMapItem = {
  AssociationClass: AssociationClass;
  AssociationType: string;
  AppScopeType: AssociationAppScopeType;
  AppPublicKeyBase58Check: string;
  AssociationOperation: AssociationOperationString;
  OpCount: number;
};

export enum AccessGroupScopeType {
  ANY = 'Any',
  SCOPED = 'Scoped',
}

export enum AccessGroupOperationString {
  ANY = 'Any',
  CREATE = 'Create',
  UPDATE = 'Update',
}

export type AccessGroupLimitMapItem = {
  AccessGroupOwnerPublicKeyBase58Check: string;
  ScopeType: AccessGroupScopeType;
  AccessGroupKeyName: string;
  OperationType: AccessGroupOperationString;
  OpCount: number;
};

export enum AccessGroupMemberOperationString {
  ANY = 'Any',
  ADD = 'Add',
  REMOVE = 'Remove',
  UPDATE = 'Update',
}

export type AccessGroupMemberLimitMapItem = {
  AccessGroupOwnerPublicKeyBase58Check: string;
  ScopeType: AccessGroupScopeType;
  AccessGroupKeyName: string;
  OperationType: AccessGroupMemberOperationString;
  OpCount: number;
};

export type StakeLimitMapItem = {
  ValidatorPublicKeyBase58Check: string;
  StakeLimit: string; // Hex string
};

export type UnstakeLimitMapItem = {
  ValidatorPublicKeyBase58Check: string;
  UnstakeLimit: string; // Hex string
};

export type UnlockStakeLimitMapItem = {
  ValidatorPublicKeyBase58Check: string;
  OpCount: number;
};

export enum LockupLimitScopeType {
  ANY = 'AnyCoins',
  SCOPED = 'ScopedCoins',
}

export enum LockupLimitOperationString {
  ANY = 'Any',
  COIN_LOCKUP = 'CoinLockup',
  UPDATE_COIN_LOCKUP_YIELD_CURVE = 'UpdateCoinLockupYieldCurve',
  UPDATE_COIN_LOCKUP_TRANSFER_RESTRICTIONS = 'UpdateCoinLockupTransferRestrictions',
  COIN_LOCKUP_TRANSFER = 'CoinLockupTransferOperationString',
  COIN_UNLOCK = 'CoinLockupUnlock',
}

export type LockupLimitMapItem = {
  ProfilePublicKeyBase58Check: string;
  ScopeType: LockupLimitScopeType;
  Operation: LockupLimitOperationString;
  OpCount: number;
};

export interface TransactionSpendingLimitResponse {
  GlobalDESOLimit: number;
  // TODO: make enum for transaction type string
  TransactionCountLimitMap?: { [k: string]: number };
  CreatorCoinOperationLimitMap?: CreatorCoinOperationLimitMap;
  DAOCoinOperationLimitMap?: DAOCoinOperationLimitMap;
  NFTOperationLimitMap?: NFTOperationLimitMap;
  DAOCoinLimitOrderLimitMap?: DAOCoinLimitOrderLimitMap;
  AssociationLimitMap?: AssociationLimitMapItem[];
  AccessGroupLimitMap?: AccessGroupLimitMapItem[];
  AccessGroupMemberLimitMap?: AccessGroupMemberLimitMapItem[];
  StakeLimitMap?: StakeLimitMapItem[];
  UnstakeLimitMap?: UnstakeLimitMapItem[];
  UnlockStakeLimitMap?: UnlockStakeLimitMapItem[];
  LockupLimitMap?: LockupLimitMapItem[];
  IsUnlimited?: boolean;
  DerivedKeyMemo?: string;
}

export interface GetAccessBytesResponse {
  TransactionSpendingLimitHex: string;
  AccessBytesHex: string;
}

@Injectable({
  providedIn: 'root',
})
export class BackendAPIService {
  blockCypherToken = 'cd455c8a5d404bb0a23880b72f56aa86';
  endpoint = `${environment.nodeURL}/api/v0`;

  constructor(
    private httpClient: HttpClient,
    private cryptoService: CryptoService,
    private signingService: SigningService,
    private accountService: AccountService,
    private globalVars: GlobalVarsService
  ) {}

  getRoute(path: string): string {
    let endpoint = this.endpoint;
    if (
      this.globalVars.network === Network.testnet &&
      this.endpoint.startsWith('https://node.deso.org')
    ) {
      endpoint = 'https://test.deso.org/api/v0';
    }
    return `${endpoint}/${path}`;
  }

  get(path: string): Observable<any> {
    return this.httpClient.get<any>(this.getRoute(path));
  }

  post(path: string, body: any): Observable<any> {
    return this.httpClient.post<any>(this.getRoute(path), body);
  }

  jwtPost(path: string, publicKey: string, body: any): Observable<any> {
    const account = this.accountService.getAccountInfo(publicKey);
    // NOTE: there are some cases where derived user's were not being sent phone number
    // verification texts due to missing public user info. This is to log how often
    // this is happening.
    logInteractionEvent('backend-api', 'jwt-post', {
      hasPublicUserInfo: !!account,
    });

    if (!account) {
      return of(null);
    }
    const isDerived = this.accountService.isMetamaskAccount(account);

    const jwt = this.signingService.signJWT(account.seedHex, isDerived);
    return this.post(path, { ...body, ...{ JWT: jwt } });
  }

  // Error parsing
  stringifyError(err: any): string {
    return err?.error?.error || JSON.stringify(err);
  }

  // When SkipForLeaderboard is true, this endpoint only returns ProfileEntryResponse, IsGraylisted, IsBlacklisted,
  //  IsAdmin, and IsSuperAdmin for each user.
  // When SkipForLeaderboard is false, we also fetch the user's balance, profiles this user follows, hodlings,  and
  //  UserMetadata. Oftentimes, this information is not needed and excluding it significantly improves performance.
  GetUsersStateless(
    publicKeys: string[],
    SkipForLeaderboard: boolean = false,
    IncludeBalance: boolean = false,
    GetUnminedBalance: boolean = false
  ): Observable<{ UserList: User[] }> {
    return this.post('get-users-stateless', {
      PublicKeysBase58Check: publicKeys,
      SkipForLeaderboard,
      IncludeBalance,
      GetUnminedBalance,
    });
  }

  VerifyHCaptcha(
    token: string,
    publicKey: string
  ): Observable<{ Success: boolean; TxnHashHex: string }> {
    return this.jwtPost('verify-captcha', publicKey, {
      Token: token,
      PublicKeyBase58Check: publicKey,
    });
  }

  GetUserProfiles(
    publicKeys: string[]
  ): Observable<{ [key: string]: UserProfile }> {
    const userProfiles: { [key: string]: any } = {};
    const req = this.GetUsersStateless(publicKeys, true, true);
    if (publicKeys.length > 0) {
      return req
        .pipe(
          map((res) => {
            for (const user of res.UserList) {
              userProfiles[user.PublicKeyBase58Check] = {
                username: user.ProfileEntryResponse?.Username,
                profilePic: user.ProfileEntryResponse?.ProfilePic,
                balanceNanos: user.BalanceNanos,
              };
            }
            return userProfiles;
          })
        )
        .pipe(
          catchError(() => {
            for (const publicKey of publicKeys) {
              userProfiles[publicKey] = {};
            }
            return of(userProfiles);
          })
        );
    } else {
      return of(userProfiles);
    }
  }

  GetSingleProfilePictureURL(
    PublicKeyBase58Check: string,
    FallbackURL?: string
  ): string {
    return `${this.getRoute(
      'get-single-profile-picture'
    )}/${PublicKeyBase58Check}?fallback=${FallbackURL}`;
  }

  JumioBegin(
    PublicKey: string,
    ReferralHashBase58: string,
    SuccessURL: string,
    ErrorURL: string
  ): Observable<any> {
    return this.jwtPost('jumio-begin', PublicKey, {
      PublicKey,
      ReferralHashBase58,
      SuccessURL,
      ErrorURL,
    });
  }

  GetAppState(): Observable<any> {
    return this.post('get-app-state', {
      PublicKeyBase58Check: '',
    });
  }

  JumioFlowFinished(
    PublicKey: string,
    JumioInternalReference: string
  ): Observable<any> {
    return this.jwtPost('jumio-flow-finished', PublicKey, {
      PublicKey,
      JumioInternalReference,
    });
  }

  GetReferralInfoForReferralHash(ReferralHash: string): Observable<{
    ReferralInfoResponse: any;
    CountrySignUpBonus: CountryLevelSignUpBonus;
  }> {
    return this.post('get-referral-info-for-referral-hash', {
      ReferralHash,
    });
  }

  GetUserDerivedKeys(
    ownerPublicKey: string
  ): Observable<{ [key: string]: DerivedKey }> {
    const derivedKeys: { [key: string]: DerivedKey } = {};
    const req = this.post('get-user-derived-keys', {
      PublicKeyBase58Check: ownerPublicKey,
    });
    return req.pipe(
      map((res) => {
        for (const derivedKey in res.DerivedKeys) {
          if (res.DerivedKeys.hasOwnProperty(derivedKey)) {
            derivedKeys[
              res.DerivedKeys[derivedKey]?.DerivedPublicKeyBase58Check
            ] = {
              derivedPublicKeyBase58Check:
                res.DerivedKeys[derivedKey]?.DerivedPublicKeyBase58Check,
              ownerPublicKeyBase58Check:
                res.DerivedKeys[derivedKey]?.OwnerPublicKeyBase58Check,
              expirationBlock: res.DerivedKeys[derivedKey]?.ExpirationBlock,
              isValid: res.DerivedKeys[derivedKey]?.IsValid,
              transactionSpendingLimit:
                res.DerivedKeys[derivedKey]?.TransactionSpendingLimit,
            };
          }
        }
        return derivedKeys;
      })
    );
  }

  GetTransactionSpending(transactionHex: string): Observable<number> {
    const req = this.post('get-transaction-spending', {
      TransactionHex: transactionHex,
    });
    return req
      .pipe(
        map((res) => {
          return res.TotalSpendingNanos as number;
        })
      )
      .pipe(
        catchError(() => {
          return of(0);
        })
      );
  }

  SendPhoneNumberVerificationText(
    PublicKeyBase58Check: string,
    PhoneNumber: string,
    PhoneNumberCountryCode: string
  ): Observable<any> {
    return this.jwtPost(
      'send-phone-number-verification-text',
      PublicKeyBase58Check,
      {
        PublicKeyBase58Check,
        PhoneNumber,
        PhoneNumberCountryCode,
      }
    );
  }

  SubmitPhoneNumberVerificationCode(
    PublicKeyBase58Check: string,
    PhoneNumber: string,
    PhoneNumberCountryCode: string,
    VerificationCode: string
  ): Observable<any> {
    return this.jwtPost(
      'submit-phone-number-verification-code',
      PublicKeyBase58Check,
      {
        PublicKeyBase58Check,
        PhoneNumber,
        PhoneNumberCountryCode,
        VerificationCode,
      }
    );
  }

  GetTransactionSpendingLimitHexString(
    transactionSpendingLimitResponse: TransactionSpendingLimitResponse
  ): Observable<string> {
    return this.post('get-transaction-spending-limit-hex-string', {
      TransactionSpendingLimit: transactionSpendingLimitResponse,
    }).pipe(
      map((res) => {
        return res.HexString;
      }),
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetAccessBytes(
    DerivedPublicKeyBase58Check: string,
    ExpirationBlock: number,
    TransactionSpendingLimit: TransactionSpendingLimitResponse
  ): Observable<GetAccessBytesResponse> {
    return this.post('get-access-bytes', {
      DerivedPublicKeyBase58Check,
      ExpirationBlock,
      TransactionSpendingLimit,
    }).pipe(
      map((res) => {
        return {
          TransactionSpendingLimitHex: res.TransactionSpendingLimitHex,
          AccessBytesHex: res.AccessBytesHex,
        };
      }),
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetTransactionSpendingLimitResponseFromHex(
    hex: string
  ): Observable<TransactionSpendingLimitResponse> {
    return this.get(`get-transaction-spending-limit-response-from-hex/${hex}`);
  }

  SendStarterDeSoForMetamaskAccount(
    request: MetamaskSignInRequest
  ): Observable<any> {
    return this.post('send-starter-deso-for-metamask-account', request).pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetSinglePost(
    PostHashHex: string,
    ReaderPublicKeyBase58Check: string = '',
    FetchParents: boolean = false,
    CommentOffset: number = 0,
    CommentLimit: number = 0,
    AddGlobalFeedBool: boolean = false
  ): Observable<PostEntryResponse | undefined> {
    return this.post('get-single-post', {
      PostHashHex,
      ReaderPublicKeyBase58Check,
      FetchParents,
      CommentOffset,
      CommentLimit,
      AddGlobalFeedBool,
    }).pipe(map((res) => res.PostFound));
  }

  GetExchangeRate(): Observable<any> {
    return this.get('get-exchange-rate');
  }

  GetBitcoinFeeRateSatoshisPerKB(): Observable<any> {
    return this.httpClient
      .get<any>('https://api.blockchain.com/mempool/fees')
      .pipe(
        catchError((err) => {
          console.error(JSON.stringify(err));
          return throwError(err);
        })
      );
  }

  getAllTransactionOutputs(tx: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // If the tx doesn't have more outputs then return.
      if (!tx.next_outputs || tx.outputs.length < 20) {
        resolve(tx);
        return;
      }

      // Else query the next_output and add the new outputs to the tx.
      // Do this recursively until everything has been fetched.
      this.httpClient
        .get<any>(tx.next_outputs + `&token=${this.blockCypherToken}`)
        .pipe(
          map((res) => {
            return res;
          }),
          catchError((err) => {
            console.error(JSON.stringify(err));
            return throwError(err);
          })
        )
        .subscribe(
          (res) => {
            // Add the next_outputs to the back of the txn
            if (res.outputs) {
              for (let ii = 0; ii < res.outputs.length; ii++) {
                tx.outputs.push(res.outputs[ii]);
              }
            }

            // If there are more outputs, then we do a dirty hack. We change
            // the next_outputs of the current txn to the next_outputs of the
            // response. Then call this function recursively to add the
            // remaining outputs.
            // BlockCypher also
            // doesn't tell us when a transaction is out of outputs, so we have
            // to assume it has more outputs if its at the maximum number of outputs,
            // which is 20 for BlockCypher.
            if (res.outputs.length >= 20) {
              tx.next_outputs = res.next_outputs;
              this.getAllTransactionOutputs(tx).then(
                (res) => {
                  resolve(res);
                },
                (err) => {
                  console.error(JSON.stringify(err));
                  resolve(tx);
                }
              );
            } else {
              resolve(tx);
            }
          },
          (err) => {
            console.error(JSON.stringify(err));
            resolve(err);
          }
        );
    });
  }

  GetBitcoinAPIInfo(bitcoinAddr: string, isTestnet: boolean): Observable<any> {
    let endpoint = `https://api.blockcypher.com/v1/btc/main/addrs/`;
    if (isTestnet) {
      endpoint = `https://api.blockcypher.com/v1/btc/test3/addrs/`;
    }

    if (bitcoinAddr !== '') {
      endpoint += `${bitcoinAddr}/`;
    }
    endpoint += `full?token=${this.blockCypherToken}`;

    return this.httpClient.get<any>(endpoint).pipe(
      map((res) => {
        // If the response has no transactions or if the final balance is zero
        // then just return it.
        if (!res.txs || !res.final_balance) {
          return new Promise((resolve, reject) => {
            resolve(res);
          });
        }

        // For each transaction, continuously fetch its outputs until we
        // run out of them.
        const txnPromises = [];
        // TODO: This causes us to hit rate limits if there are too many
        // transactions in the backlog. We should fix this at some point.
        for (let ii = 0; ii < res.txs.length; ii++) {
          txnPromises.push(this.getAllTransactionOutputs(res.txs[ii]));
        }

        return Promise.all(txnPromises).then((xxx) => res);
      }),
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  ExchangeBitcoin(
    LatestBitcionAPIResponse: any,
    BTCDepositAddress: string,
    PublicKeyBase58Check: string,
    BurnAmountSatoshis: number,
    FeeRateSatoshisPerKB: number,
    SignedHashes: string[],
    Broadcast: boolean
  ): Observable<any> {
    // Check if the user is logged in with a derived key and operating as the owner key.
    const DerivedPublicKeyBase58Check =
      this.accountService.getEncryptedUsers()[PublicKeyBase58Check]
        ?.derivedPublicKeyBase58Check;

    const req = this.post('exchange-bitcoin', {
      PublicKeyBase58Check,
      DerivedPublicKeyBase58Check,
      BurnAmountSatoshis,
      LatestBitcionAPIResponse,
      BTCDepositAddress,
      FeeRateSatoshisPerKB,
      SignedHashes,
      Broadcast,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  SubmitETHTx(
    PublicKeyBase58Check: string,
    Tx: any,
    ToSign: string[],
    SignedHashes: string[]
  ): Observable<any> {
    const req = this.post('submit-eth-tx', {
      PublicKeyBase58Check,
      Tx,
      ToSign,
      SignedHashes,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  QueryETHRPC(method: string, params: string[]): Observable<any> {
    const req = this.post('query-eth-rpc', {
      Method: method,
      Params: params,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetWyreWalletOrderReservation(
    referenceId: string,
    sourceAmount: number,
    country: string,
    sourceCurrency: string,
    redirectURL: string
  ): Observable<any> {
    const req = this.post('get-wyre-wallet-order-reservation', {
      ReferenceId: referenceId,
      SourceAmount: sourceAmount,
      Country: country,
      SourceCurrency: sourceCurrency,
      RedirectUrl: redirectURL,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetWyreWalletOrderQuotation(
    sourceAmount: number,
    country: string,
    sourceCurrency: string
  ): Observable<any> {
    const req = this.post('get-wyre-wallet-order-quotation', {
      SourceAmount: sourceAmount,
      Country: country,
      SourceCurrency: sourceCurrency,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetTxn(TxnHashHex: string): Observable<any> {
    return this.post('get-txn', {
      TxnHashHex,
    });
  }

  AuthorizeDerivedKey(
    OwnerPublicKeyBase58Check: string,
    DerivedPublicKeyBase58Check: string,
    ExpirationBlock: number,
    AccessSignature: string,
    TransactionSpendingLimitHex: string
  ): Observable<any> {
    const req = this.post('authorize-derived-key', {
      OwnerPublicKeyBase58Check,
      DerivedPublicKeyBase58Check,
      DerivedKeySignature: false,
      ExpirationBlock,
      MinFeeRateNanosPerKB: 1000,
      AccessSignature,
      TransactionSpendingLimitHex,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  GetBulkMessagingPublicKeys(
    GroupOwnerPublicKeysBase58Check: string[],
    MessagingGroupKeyNames: string[]
  ): Observable<any> {
    const req = this.post('get-bulk-messaging-public-keys', {
      GroupOwnerPublicKeysBase58Check,
      MessagingGroupKeyNames,
    });

    return req.pipe(
      catchError((err) => {
        console.error(JSON.stringify(err));
        return throwError(err);
      })
    );
  }

  SubmitTransaction(TransactionHex: string): Observable<any> {
    const req = this.post('submit-transaction', {
      TransactionHex,
    });

    return req.pipe(
      catchError((err) => {
        console.log(err);
        return throwError(err);
      })
    );
  }
}

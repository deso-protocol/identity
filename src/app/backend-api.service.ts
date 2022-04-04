import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {environment} from '../environments/environment';
import {SigningService} from './signing.service';
import {AccountService} from './account.service';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';
import {DerivedKey, Network, UserProfile} from '../types/identity';
import { TransactionSpendingLimit } from 'src/lib/deso/transaction';

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
  ProfileEntryResponse: ProfileEntryResponse;
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
}


export class User {
  ProfileEntryResponse: ProfileEntryResponse | null = null;
  PublicKeyBase58Check: string = "";
  HasPhoneNumber: boolean | null = null;
  BalanceNanos: number = 0;
  UsersYouHODL: any[] = [];
}

type CountryLevelSignUpBonus = {
  AllowCustomReferralAmount: boolean;
  ReferralAmountOverrideUSDCents: number;
  AllowCustomKickbackAmount: boolean;
  KickbackAmountOverrideUSDCents: number;
};

export enum CreatorCoinLimitOperationString {
  ANY = "any",
  BUY = "buy",
  SELL = "sell",
  TRANSFER = "transfer",
}

export enum DAOCoinLimitOperationString {
  ANY = "any",
  MINT = "mint",
  BURN = "burn",
  DISABLE_MINTING = "disable_minting",
  UPDATE_TRANSFER_RESTRICTION_STATUS = "update_transfer_restriction_status",
  TRANSFER = "transfer",
}

export type CoinLimitOperationString = DAOCoinLimitOperationString | CreatorCoinLimitOperationString;

export type CoinOperationLimitMap<T extends CoinLimitOperationString> = {
  [public_key: string]: OperationToCountMap<T>;
};

export type OperationToCountMap<T extends LimitOperationString> = {
  [operation in T]?: number;
};

export type LimitOperationString = DAOCoinLimitOperationString | CreatorCoinLimitOperationString | NFTLimitOperationString;
export type CreatorCoinOperationLimitMap = CoinOperationLimitMap<CreatorCoinLimitOperationString>;
export type DAOCoinOperationLimitMap = CoinOperationLimitMap<DAOCoinLimitOperationString>;

export enum NFTLimitOperationString {
  ANY = "any",
  UPDATE = "update",
  BID = "nft_bid",
  ACCEPT_BID = "accept_nft_bid",
  TRANSFER = "transfer",
  BURN = "burn",
  ACCEPT_TRANSFER = "accept_nft_transfer",
}
export type NFTOperationLimitMap = {
  [post_hash_hex: string]: {
    [serial_number: number]: OperationToCountMap<NFTLimitOperationString>;
  };
};

export type TransactionSpendingLimitResponse = {
  GlobalDESOLimit: number;
  // TODO: make enum for transaction type string
  TransactionCountLimitMap?: { [k: string]: number };
  CreatorCoinOperationLimitMap?: CreatorCoinOperationLimitMap;
  DAOCoinOperationLimitMap?: DAOCoinOperationLimitMap;
  NFTOperationLimitMap?: NFTOperationLimitMap;
  DerivedKeyMemo?: string;
};

@Injectable({
  providedIn: 'root'
})
export class BackendAPIService {
  endpoint = `${environment.nodeURL}/api/v0`;

  constructor(
    private httpClient: HttpClient,
    private cryptoService: CryptoService,
    private signingService: SigningService,
    private accountService: AccountService,
    private globalVars: GlobalVarsService,
  ) { }

  getRoute(path: string): string {
    let endpoint = this.endpoint;
    if (this.globalVars.network === Network.testnet && this.endpoint.startsWith("https://node.deso.org")) {
      endpoint = "https://test.deso.org/api/v0";
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
    const publicUserInfo = this.accountService.getEncryptedUsers()[publicKey];
    if (!publicUserInfo) {
      return of(null);
    }

    const seedHex = this.cryptoService.decryptSeedHex(publicUserInfo.encryptedSeedHex, this.globalVars.hostname);
    const jwt = this.signingService.signJWT(seedHex);
    return this.post(path, {...body, ...{JWT: jwt}});
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
    publicKeys: string[], SkipForLeaderboard: boolean = false,
  ): Observable<{ UserList: User[]}> {
    return this.post('get-users-stateless',
      {
        PublicKeysBase58Check: publicKeys,
        SkipForLeaderboard,
      },
    );
  }

  GetUserProfiles(
    publicKeys: string[]
  ): Observable<{[key: string]: UserProfile}> {
      const userProfiles: {[key: string]: any} = {};
      const req = this.GetUsersStateless(publicKeys, true);
      if (publicKeys.length > 0) {
        return req.pipe(
          map( res => {
            for (const user of res.UserList) {
              userProfiles[user.PublicKeyBase58Check] = {
                username: user.ProfileEntryResponse?.Username,
                profilePic: user.ProfileEntryResponse?.ProfilePic,
              };
            }
            return userProfiles;
          })
        ).pipe(
          catchError(() => {
            for(const publicKey of publicKeys) {
              userProfiles[publicKey] = {};
            }
            return of(userProfiles);
          })
        );
      } else {
        return of(userProfiles);
      }
  }

  GetSingleProfilePictureURL(PublicKeyBase58Check: string): string {
    return `${this.getRoute('get-single-profile-picture')}/${PublicKeyBase58Check}`;
  }

  JumioBegin(PublicKey: string, ReferralHashBase58: string, SuccessURL: string, ErrorURL: string): Observable<any> {
    const publicUserInfo = this.accountService.getEncryptedUsers()[PublicKey];
    if (!publicUserInfo) {
      return of(null);
    }

    const seedHex = this.cryptoService.decryptSeedHex(publicUserInfo.encryptedSeedHex, this.globalVars.hostname);
    const jwt = this.signingService.signJWT(seedHex);

    return this.post('jumio-begin',
      {
        JWT: jwt,
        PublicKey,
        ReferralHashBase58,
        SuccessURL,
        ErrorURL,
      }
    );
  }

  GetAppState(): Observable<any> {
    return this.post('get-app-state', {
      PublicKeyBase58Check: '',
    });
  }

  JumioFlowFinished(PublicKey: string, JumioInternalReference: string): Observable<any> {
    const publicUserInfo = this.accountService.getEncryptedUsers()[PublicKey];
    if (!publicUserInfo) {
      return of(null);
    }

    const seedHex = this.cryptoService.decryptSeedHex(publicUserInfo.encryptedSeedHex, this.globalVars.hostname);
    const jwt = this.signingService.signJWT(seedHex);

    return this.post('jumio-flow-finished', {
      PublicKey,
      JumioInternalReference,
      JWT: jwt,
    });
  }

  GetReferralInfoForReferralHash(
    ReferralHash: string
  ): Observable<{ ReferralInfoResponse: any; CountrySignUpBonus: CountryLevelSignUpBonus }> {
    return this.post('get-referral-info-for-referral-hash', {
      ReferralHash,
    });
  }

  GetUserDerivedKeys(
    ownerPublicKey: string
  ): Observable< { [key: string]: DerivedKey } > {
    const derivedKeys: { [key: string]: DerivedKey } = {};
    const req = this.post('get-user-derived-keys',
      {
        PublicKeyBase58Check: ownerPublicKey,
      },
    );
    return req.pipe(
      map( res => {
        for (const derivedKey in res.DerivedKeys) {
          if (res.DerivedKeys.hasOwnProperty(derivedKey)) {
            derivedKeys[res.DerivedKeys[derivedKey]?.DerivedPublicKeyBase58Check] = {
              derivedPublicKeyBase58Check: res.DerivedKeys[derivedKey]?.DerivedPublicKeyBase58Check,
              ownerPublicKeyBase58Check: res.DerivedKeys[derivedKey]?.OwnerPublicKeyBase58Check,
              expirationBlock: res.DerivedKeys[derivedKey]?.ExpirationBlock,
              isValid: res.DerivedKeys[derivedKey]?.IsValid,
              transactionSpendingLimit: res.DerivedKeys[derivedKey]?.TransactionSpendingLimit,
            };
          }
        }
        return derivedKeys;
      })
    );
  }

  GetTransactionSpending(
    transactionHex: string
  ): Observable<number> {
    const req = this.post('get-transaction-spending',
      {
        TransactionHex: transactionHex,
      },
    );
    return req.pipe(
      map( res => {
        return res.TotalSpendingNanos as number;
      })
    ).pipe(
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
    return this.jwtPost("send-phone-number-verification-text", PublicKeyBase58Check, {
      PublicKeyBase58Check,
      PhoneNumber,
      PhoneNumberCountryCode,
    });
  }

  SubmitPhoneNumberVerificationCode(
    PublicKeyBase58Check: string,
    PhoneNumber: string,
    PhoneNumberCountryCode: string,
    VerificationCode: string
  ): Observable<any> {
    return this.jwtPost("submit-phone-number-verification-code", PublicKeyBase58Check, {
      PublicKeyBase58Check,
      PhoneNumber,
      PhoneNumberCountryCode,
      VerificationCode,
    });
  }

  GetTransactionSpendingLimitHexString(
    TransactionSpendingLimitResponse: TransactionSpendingLimitResponse
  ): Observable<string> {
    return this.post("get-transaction-spending-limit-hex-string", {
      TransactionSpendingLimit: TransactionSpendingLimitResponse,
    }).pipe(
      map(
        res => {
          return res.HexString;
    }),
      catchError((err) => {
        console.error(err);
        return throwError(err);
      }));
  }

  GetTransactionSpendingLimitResponseFromHex(
    hex: string
  ): Observable<TransactionSpendingLimitResponse> {
    return this.get(`get-transaction-spending-limit-response-from-hex/${hex}`)
  }

  GetSinglePost(PostHashHex: string,
                ReaderPublicKeyBase58Check: string = "",
                FetchParents: boolean = false,
                CommentOffset: number = 0,
                CommentLimit: number = 0,
                AddGlobalFeedBool: boolean = false
  ): Observable<PostEntryResponse | undefined> {
    return this.post("get-single-post", {
      PostHashHex,
      ReaderPublicKeyBase58Check,
      FetchParents,
      CommentOffset,
      CommentLimit,
      AddGlobalFeedBool,
    }).pipe(
      map(
        res => res.PostFound
      )
    );
  }
}

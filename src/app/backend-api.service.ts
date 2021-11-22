import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {catchError, map} from 'rxjs/operators';
import {environment} from '../environments/environment';
import {SigningService} from './signing.service';
import {AccountService} from './account.service';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';
import {DerivedKey, UserProfile} from '../types/identity';

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

export class User {
  ProfileEntryResponse: ProfileEntryResponse | null = null;
  PublicKeyBase58Check: string = "";
  HasPhoneNumber: boolean | null = null;
  BalanceNanos: number = 0;
  UsersYouHODL: any[] = [];
}

@Injectable({
  providedIn: 'root'
})
export class BackendAPIService {
  endpoint = `https://${environment.nodeHostname}/api/v0`;

  constructor(
    private httpClient: HttpClient,
    private cryptoService: CryptoService,
    private signingService: SigningService,
    private accountService: AccountService,
    private globalVars: GlobalVarsService,
  ) { }

  post(path: string, body: any): Observable<any> {
    return this.httpClient.post<any>(`${this.endpoint}/${path}`, body);
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
    return this.httpClient.post<any>(
      `${this.endpoint}/get-users-stateless`,
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
    return `${this.endpoint}/get-single-profile-picture/${PublicKeyBase58Check}`;
  }

  JumioBegin(PublicKey: string, ReferralHashBase58: string, SuccessURL: string, ErrorURL: string): Observable<any> {
    const publicUserInfo = this.accountService.getEncryptedUsers()[PublicKey];
    if (!publicUserInfo) {
      return of(null);
    }

    const seedHex = this.cryptoService.decryptSeedHex(publicUserInfo.encryptedSeedHex, this.globalVars.hostname);
    const jwt = this.signingService.signJWT(seedHex);

    return this.httpClient.post<any>(
      `${this.endpoint}/jumio-begin`,
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
    return this.httpClient.post<any>(`${this.endpoint}/get-app-state`, {
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

    return this.httpClient.post<any>(`${this.endpoint}/jumio-flow-finished`, {
      PublicKey,
      JumioInternalReference,
      JWT: jwt,
    });
  }

  GetReferralInfoForReferralHash(ReferralHash: string): Observable<any> {
    return this.httpClient.post<any>(`${this.endpoint}/get-referral-info-for-referral-hash`, {
      ReferralHash,
    });
  }

  GetUserDerivedKeys(
    ownerPublicKey: string
  ): Observable< { [key: string]: DerivedKey } > {
    const derivedKeys: { [key: string]: DerivedKey } = {};
    const req = this.httpClient.post<any>(
      `${this.endpoint}/get-user-derived-keys`,
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
    const req = this.httpClient.post<any>(
      `${this.endpoint}/get-transaction-spending`,
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
}

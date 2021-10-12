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

  GetUsersStateless(
    publicKeys: any[]
  ): Observable<any> {
    return this.httpClient.post<any>(
      `${this.endpoint}/get-users-stateless`,
      {
        PublicKeysBase58Check: publicKeys,
      },
    );
  }

  GetUserProfiles(
    publicKeys: any[]
  ): Observable<{[key: string]: UserProfile}> {
      const userProfiles: {[key: string]: any} = {};
      const req = this.GetUsersStateless(publicKeys);
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
}

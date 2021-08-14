import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {environment} from '../environments/environment';
import {SigningService} from './signing.service';
import {AccountService} from './account.service';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';

interface UserProfile {
  username: string;
  profilePic: any;
}

@Injectable({
  providedIn: 'root'
})

export class BackendAPIService {
  endpoint = `https://${environment.nodeHostname}/api/v0`;
  exchange = `https://${environment.nodeHostname}/api/v1`;

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
    return new Observable<{[key: string]: UserProfile}>(subscriber => {
      const userProfiles: {[key: string]: any} = {};

      if (publicKeys.length > 0) {
        for (const publicKey of publicKeys) {
          userProfiles[publicKey] = {};
        }
        this.GetUsersStateless(publicKeys).subscribe(res => {
          for (const user of res.UserList) {
            userProfiles[user.PublicKeyBase58Check] = {
              username: user.ProfileEntryResponse?.Username,
              profilePic: user.ProfileEntryResponse?.ProfilePic,
            };
          }
          subscriber.next(userProfiles);
        });
      } else {
        subscriber.next(userProfiles);
      }
    });
  }

  GetSingleProfilePictureURL(PublicKeyBase58Check: string): string {
    return `${this.endpoint}/get-single-profile-picture/${PublicKeyBase58Check}`;
  }


  GetBlockTipHeight(): Observable<any> {
    return this.httpClient.get<any>(
      `${this.exchange}`
    );
  }

  JumioBegin(PublicKey: string, SuccessURL: string, ErrorURL: string): Observable<any> {
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
}

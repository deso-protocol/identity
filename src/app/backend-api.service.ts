import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable, of} from 'rxjs';
import {environment} from '../environments/environment';
import {SigningService} from './signing.service';
import {AccountService} from './account.service';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';

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
      PublicKeyBase58Check: "",
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
}

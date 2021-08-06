import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../environments/environment';

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
      for (const publicKey of publicKeys) {
        userProfiles[publicKey] = {};
      }

      if (publicKeys.length > 0) {
        this.GetUsersStateless(publicKeys).subscribe(res => {
          for (const user of res.UserList) {
            userProfiles[user.PublicKeyBase58Check] = {
              username: user.ProfileEntryResponse?.Username,
              profilePic: user.ProfileEntryResponse?.ProfilePic,
            };
          }
          subscriber.next(userProfiles);
        });
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
}

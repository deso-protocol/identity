import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BackendAPIService {
  endpoint = `https://${environment.nodeHostname}/api/v0`;

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
  GetSingleProfilePictureURL(PublicKeyBase58Check: string): string {
    return `${this.endpoint}/get-single-profile-picture/${PublicKeyBase58Check}`;
  }
}

import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BackendAPIService {
  endpoint = 'https://api.bitclout.com';

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
}

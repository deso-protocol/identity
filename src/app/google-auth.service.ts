import {Injectable, NgZone} from '@angular/core';
import {Observable, Observer, of, ReplaySubject, Subject} from 'rxjs';
import {GoogleApiService} from './google-api.service';
import {mergeMap} from 'rxjs/operators';
import GoogleAuth = gapi.auth2.GoogleAuth;

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  // Client ID and API key from the Developer Console
  private static CLIENT_ID = '48709226407-0sm6tf3p2o2u6u2v0ih7513saagg10v2.apps.googleusercontent.com';
  private static API_KEY = 'AIzaSyAoG3mKhI9tPQe4d5MkTxu_NL3riZDh3Os';
  public static DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

  private googleAuth: GoogleAuth | undefined = undefined;

  constructor(private googleApi: GoogleApiService, private zone: NgZone) {
    this.googleApi.onLoad().subscribe(() => {
      this.loadGapiAuth().subscribe();
    });
  }

  public getAuth(): Observable<GoogleAuth> {
    if (!this.googleAuth) {
      return this.googleApi.onLoad().pipe(mergeMap(() => this.loadGapiAuth()));
    }
    return of(this.googleAuth);
  }

  private loadGapiAuth(): Observable<GoogleAuth> {
    return new Observable((observer: Observer<GoogleAuth>) => {
      gapi.load('client', () => {
        gapi.client.init({
          clientId: GoogleAuthService.CLIENT_ID,
          scope: GoogleAuthService.DRIVE_SCOPE,
          apiKey: GoogleAuthService.API_KEY,
        }).then(() => {
          this.googleAuth = gapi.auth2.getAuthInstance();
          observer.next(this.googleAuth);
          observer.complete();
        }).catch((err: any) => observer.error(err));
      });
    });
  }
}

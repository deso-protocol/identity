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
  private static CLIENT_ID = '48709226407-vuriktl4ub77gl5ifbsbsm3d2jnrshvt.apps.googleusercontent.com';
  private static API_KEY = 'AIzaSyBZ5cttLVWM0wXawdGKMYkbJ3SbBM4BpuE';
  public static DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

  private googleAuth: GoogleAuth | undefined = undefined;

  constructor(private googleApi: GoogleApiService) {
    this.getAuth().subscribe();
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

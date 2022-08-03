import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouteNames } from './app-routing.module';
import { GoogleAuthState, Network } from '../types/identity';
import { GlobalVarsService } from './global-vars.service';

@Injectable({
  providedIn: 'root',
})
export class GoogleDriveService {
  public static CLIENT_ID =
    '48709226407-vuriktl4ub77gl5ifbsbsm3d2jnrshvt.apps.googleusercontent.com';
  public static DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

  private accessToken: string | undefined;

  constructor(
    private httpClient: HttpClient,
    public globalVars: GlobalVarsService
  ) {}

  public setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  public uploadFile(fileName: string, fileContents: string): Observable<any> {
    const file = new Blob([fileContents], { type: 'text/plain' });
    const metadata = {
      name: fileName,
      mimeType: 'text/plain',
      parents: ['appDataFolder'],
    };

    const form = new FormData();
    form.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    form.append('file', file);

    return this.httpClient.post<any>(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      form,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
  }

  public listFiles(fileName: string): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('q', `name = '${fileName}'`);
    httpParams = httpParams.append('pageSize', '100');
    httpParams = httpParams.append('fields', 'files(id, name)');
    httpParams = httpParams.append('spaces', 'appDataFolder');

    return this.httpClient.get<any>(
      `https://www.googleapis.com/drive/v3/files?${httpParams.toString()}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
  }

  public getFile(fileId: string): Observable<any> {
    let httpParams = new HttpParams();
    httpParams = httpParams.append('alt', 'media');

    return this.httpClient.get<any>(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${httpParams.toString()}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
  }

  public launchGoogle(): void {
    const redirectUri = new URL(
      `${window.location.origin}/${RouteNames.AUTH_GOOGLE}`
    );

    const oauthUri = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUri.searchParams.append('redirect_uri', redirectUri.toString());
    oauthUri.searchParams.append('client_id', GoogleDriveService.CLIENT_ID);
    oauthUri.searchParams.append('scope', GoogleDriveService.DRIVE_SCOPE);
    oauthUri.searchParams.append('response_type', 'token');

    // TODO: Investigate using this parameter to defend against CSRF attacks
    // pass on webview state to Google OAuth state
    // https://stackoverflow.com/questions/7722062/google-oauth-2-0-redirect-uri-with-several-parameters
    const stateParams: GoogleAuthState = {
      webview: this.globalVars.webview,
      testnet: this.globalVars.network === Network.testnet,
      jumio: this.globalVars.jumio,
      derive: this.globalVars.derive,
      callback: this.globalVars.callback,
      signedUp: this.globalVars.signedUp,
      getFreeDeso: this.globalVars.getFreeDeso,
    };

    const stateString = btoa(JSON.stringify(stateParams));
    oauthUri.searchParams.append('state', stateString);

    window.location.href = oauthUri.toString();
  }
}

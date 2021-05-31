import {Injectable, NgZone} from '@angular/core';
import {GoogleApiService} from './google-api.service';
import {Observable, Observer, of} from 'rxjs';
import {mergeMap} from 'rxjs/operators';

import GoogleDriveFiles = gapi.client.drive.FilesResource;
import {GoogleAuthService} from './google-auth.service';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {

  private googleDriveFiles: GoogleDriveFiles | undefined = undefined;

  constructor(private googleAuth: GoogleAuthService, private httpClient: HttpClient) {}

  public uploadFile(fileName: string, fileContents: string): Observable<any> {
    const file = new Blob([fileContents], {type: 'text/plain'});
    const metadata = {
      name: fileName,
      mimeType: 'text/plain',
      parents: ['appDataFolder'],
    };

    const accessToken = gapi.auth.getToken().access_token;
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    return this.httpClient.post<any>(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      form, { headers: { Authorization: `Bearer ${accessToken}` }});
  }

  public getFiles(): Observable<GoogleDriveFiles> {
    if (!this.googleDriveFiles) {
      return this.googleAuth.getAuth().pipe(mergeMap(() => this.loadGoogleDrive()));
    }
    return of(this.googleDriveFiles);
  }

  private loadGoogleDrive(): Observable<GoogleDriveFiles> {
    return new Observable((observer: Observer<GoogleDriveFiles>) => {
      gapi.client.load('drive', 'v3', () => {
        this.googleDriveFiles = gapi.client.drive.files;
        observer.next(this.googleDriveFiles);
        observer.complete();
      });
    });
  }
}

import {Injectable, NgZone} from '@angular/core';
import {Observable, Observer, of} from 'rxjs';

import GoogleDriveFiles = gapi.client.drive.FilesResource;
import {GoogleAuthService} from './google-auth.service';
import {HttpClient, HttpParams} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {

  constructor(private googleAuth: GoogleAuthService, private httpClient: HttpClient) {
  }

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

  public listFiles(fileName: string): Observable<any> {
    const accessToken = gapi.auth.getToken().access_token;
    let httpParams = new HttpParams();

    httpParams = httpParams.append('q', `name = '${fileName}'`);
    httpParams = httpParams.append('pageSize', '100');
    httpParams = httpParams.append('fields', 'files(id, name)');
    httpParams = httpParams.append('spaces', 'appDataFolder');

    return this.httpClient.get<any>(
      `https://www.googleapis.com/drive/v3/files?${httpParams.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` }});
  }

  public getFile(fileId: string): Observable<any> {
    const accessToken = gapi.auth.getToken().access_token;
    let httpParams = new HttpParams();
    httpParams = httpParams.append('alt', 'media');

    return this.httpClient.get<any>(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${httpParams.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` }});
  }
}

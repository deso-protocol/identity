import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TextService {
  constructor() {}

  copyText(val: string): void {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  downloadText(val: string, fileName: string): void {
    const contents = encodeURIComponent(val);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + contents);
    element.setAttribute('download', fileName);
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Assemble a URL to hit the BE with.
  makeRequestURL(
    endpoint: string,
    routeName: string,
    adminPublicKey?: string
  ): string {
    let queryURL = location.protocol + '//' + endpoint + routeName;
    // If the protocol is specified within the endpoint then use that.
    if (endpoint.startsWith('http')) {
      queryURL = endpoint + routeName;
    }
    if (adminPublicKey) {
      queryURL += `?admin_public_key=${adminPublicKey}`;
    }
    return queryURL;
  }
}

import { Component } from '@angular/core';
import { IdentityService } from '../identity.service';

@Component({
  selector: 'app-embed',
  templateUrl: './embed.component.html',
  styleUrls: ['./embed.component.scss'],
})
export class EmbedComponent {
  constructor(public identityService: IdentityService) {}

  tapToUnlock(): void {
    if (!this.identityService.browserSupported) {
      return;
    }

    document.requestStorageAccess().then(() => {
      this.identityService.storageGranted(true);
    }).catch(() => {
      // This can fail in at least 2 cases (maybe more):
      // 1. In some cases, the user's browser shows a native confirmation prompt after they tap the embed
      //    asking if they allow or deny access to cookies and local storage. If the user chooses not to allow
      //    access, the requestStorageAccess promise will reject. If this rejected promise is not handled, the
      //    the embed will appear "stuck" and the user cannot exit it without reloading the page.
      // 2. The embed does not have "first-party" status according to the browser. This is a bit involved for
      //    to explain here but see this github issue comment for more information
      //    https://github.com/deso-protocol/deso-workspace/issues/17#issuecomment-1247387525.
      this.identityService.storageGranted(false);
    });
  }
}

import {Component} from '@angular/core';
import {IdentityService} from '../identity.service';

@Component({
  selector: 'app-embed',
  templateUrl: './embed.component.html',
  styleUrls: ['./embed.component.scss']
})
export class EmbedComponent {

  constructor(
    public identityService: IdentityService,
  ) { }

  tapToUnlock(): void {
    if (!this.identityService.browserSupported) {
      return;
    }

    document.requestStorageAccess().then(() => {
      this.identityService.storageGranted();
    });
  }

}

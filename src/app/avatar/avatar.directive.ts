import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import _ from 'lodash';
import { BackendAPIService } from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';

@Directive({
  selector: '[appAvatar]',
})
export class AvatarDirective implements OnChanges {
  @Input() appAvatar: string | undefined = '';

  constructor(
    private globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private el: ElementRef
  ) {
  }

  setAvatar(): void {
    if (!this.appAvatar) {
      return;
    }

    if (!this.appAvatar) {
      this.setURLOnElement(
        this.backendApi.GetDefaultProfilePictureURL()
      );
      return;
    }

    // Although it would be hard for an attacker to inject a malformed public key into the app,
    // we do a basic _.escape anyways just to be extra safe.
    const profPicURL = _.escape(
      this.backendApi.GetSingleProfilePictureURL(
        this.appAvatar,
        this.backendApi.GetDefaultProfilePictureURL()
      )
    );

    // Set the URL on the element.
    this.setURLOnElement(profPicURL);
  }

  ngOnChanges(changes: any): void {
    if (changes.appAvatar && changes.appAvatar !== this.appAvatar) {
      this.setAvatar();
    }
  }

  setURLOnElement(profilePicURL: string) {
    this.el.nativeElement.style.backgroundImage = `url(${profilePicURL})`;
    this.el.nativeElement.style.backgroundPosition = 'center';
    this.el.nativeElement.style.backgroundSize = 'cover';
    this.el.nativeElement.style.backgroundRepeat = 'no-repeat';
  }
}

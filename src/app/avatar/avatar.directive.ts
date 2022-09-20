import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService } from '../backend-api.service';
import _ from 'lodash';

@Directive({
  selector: '[appAvatar]',
})
export class AvatarDirective implements OnChanges {
  @Input() appAvatar: string | undefined = '';

  constructor(
    private globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private el: ElementRef
  ) {}

  setAvatar(): void {
    if (!this.appAvatar) {
      return;
    }

    if (!this.appAvatar) {
      this.setURLOnElement(
        this.backendApi.GetDefaultProfilePictureURL(window.location.host)
      );
      return;
    }
    // The fallback route is the route to the pic we use if we can't find an avatar for the user.
    const fallbackRoute = `fallback=${this.backendApi.GetDefaultProfilePictureURL(window.location.host)}`;

    // Although it would be hard for an attacker to inject a malformed public key into the app,
    // we do a basic _.escape anyways just to be extra safe.
    const profPicURL = _.escape(
      this.backendApi.GetSingleProfilePictureURL(
        this.appAvatar,
        fallbackRoute
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
  }
}

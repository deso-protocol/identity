import { Directive, ElementRef, Input, OnChanges } from '@angular/core';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService } from '../backend-api.service';

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
    // cast the this object to a normal var since binding get out of wack in the arrow function
    const appAvatar = this.appAvatar;
    const element = this.el.nativeElement;
    // calling fetch here to see if an page has a 404
    fetch(this.backendApi.GetSingleProfilePictureURL(this.appAvatar)).then(
      (res) => {
        if (res.status === 200) {
          element.style.backgroundImage = `url(${this.backendApi.GetSingleProfilePictureURL(
            appAvatar
          )})`;
        } else {
          element.style.backgroundImage = `url( assets/placeholder-account-image.png)`;
        }
      }
    );
  }

  ngOnChanges(changes: any): void {
    if (changes.appAvatar && changes.appAvatar !== this.appAvatar) {
      this.setAvatar();
    }
  }
}

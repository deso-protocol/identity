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
    this.el.nativeElement.style.backgroundImage = `url(${this.backendApi.GetSingleProfilePictureURL(
      this.appAvatar
    )})`;
  }

  ngOnChanges(changes: any): void {
    if (changes.appAvatar && changes.appAvatar !== this.appAvatar) {
      this.setAvatar();
    }
  }
}

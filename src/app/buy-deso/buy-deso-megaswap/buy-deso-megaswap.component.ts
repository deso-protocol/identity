
import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GlobalVarsService } from 'src/app/global-vars.service';
import { environment } from 'src/environments/environment';
import { RouteNames } from '../../app-routing.module';
import { Router } from '@angular/router';
import { IdentityService } from '../../identity.service';
import { AccountService } from '../../account.service';

@Component({
  selector: 'buy-deso-megaswap',
  templateUrl: './buy-deso-megaswap.component.html',
  styleUrls: ['./buy-deso-megaswap.component.scss'],
})
export class BuyDeSoMegaSwapComponent implements OnInit {
  iframeURL: SafeResourceUrl = '';

  RouteNames = RouteNames;
  @Input() publicKey: string | undefined;

  constructor(
    public globalVars: GlobalVarsService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private identityService: IdentityService,
    private accountService: AccountService,
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    if (!environment.megaswapURL) {
      return;
    }

    this.iframeURL = this.sanitizer.bypassSecurityTrustResourceUrl(
      [
        environment.megaswapURL,
        '/#/iframe/v1?',
        `network=${this.globalVars.network}`,
        '&destinationTickers=DESO',
        '&destinationTicker=DESO',
        `&destinationAddress=${this.publicKey || ''}`,
      ].join('')
    );
  }

  finishFlow(): void {
    if (this.globalVars.derive) {
      this.router.navigate(['/', RouteNames.DERIVE], {
        queryParams: { publicKey: this.publicKey },
        queryParamsHandling: 'merge',
      });
    } else {
      this.login();
    }
  }

  login(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKey,
      signedUp: this.globalVars.signedUp,
    });
  }
}

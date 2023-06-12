import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { GlobalVarsService } from 'src/app/global-vars.service';
import { logInteractionEvent } from 'src/app/interaction-event-helpers';
import { environment } from 'src/environments/environment';
import { AccountService } from '../../account.service';
import { RouteNames } from '../../app-routing.module';
import { IdentityService } from '../../identity.service';

@Component({
  selector: 'buy-deso-heroswap',
  templateUrl: './buy-deso-heroswap.component.html',
  styleUrls: ['./buy-deso-heroswap.component.scss'],
})
export class BuyDeSoHeroSwapComponent implements OnInit, OnDestroy {
  iframeURL: SafeResourceUrl = '';

  RouteNames = RouteNames;
  @Input() publicKey: string | undefined;

  constructor(
    public globalVars: GlobalVarsService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private identityService: IdentityService,
    private accountService: AccountService,
  ) {
  }

  ngOnInit(): void {
    window.scroll(0, 0);
    if (!environment.heroswapURL) {
      return;
    }

    this.iframeURL = this.sanitizer.bypassSecurityTrustResourceUrl(
      [
        environment.heroswapURL,
        '/#/iframe/v1?',
        `network=${this.globalVars.network}`,
        '&destinationTickers=DESO',
        '&destinationTicker=DESO',
        `&destinationAddress=${this.publicKey || ''}`,
        `&now=${Date.now()}`,
      ].join('')
    );

    window.addEventListener("message", this.#heroswapMessageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener("message", this.#heroswapMessageListener);
  }

  finishFlow(): void {
    if (this.globalVars.derive) {
      this.router.navigate(['/', RouteNames.DERIVE], {
        queryParams: {publicKey: this.publicKey},
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

  #heroswapMessageListener = (event: MessageEvent) => {
    if (event.origin !== environment.heroswapURL) return;
    logInteractionEvent("heroswap-iframe", "message", event.data);
  }
}

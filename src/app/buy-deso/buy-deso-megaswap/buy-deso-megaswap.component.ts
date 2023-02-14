
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
  selector: 'buy-deso-megaswap',
  templateUrl: './buy-deso-megaswap.component.html',
  styleUrls: ['./buy-deso-megaswap.component.scss'],
})
export class BuyDeSoMegaSwapComponent implements OnInit, OnDestroy {
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
        `&now=${Date.now()}`,
      ].join('')
    );

    window.addEventListener("message", this.#megaswapMessageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener("message", this.#megaswapMessageListener);
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

  #megaswapMessageListener = (event: MessageEvent) => {
      if (event.origin !== environment.megaswapURL) return;
      logInteractionEvent("megaswap-iframe", "message", event.data);
  }
}

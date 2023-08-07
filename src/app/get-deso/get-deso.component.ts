import { Component, OnDestroy, OnInit } from '@angular/core';
import { EntropyService } from '../entropy.service';
import { CryptoService } from '../crypto.service';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { environment } from '../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
import { TextService } from '../text.service';
import * as bip39 from 'bip39';
import { RouteNames } from '../app-routing.module';
import { BackendAPIService } from '../backend-api.service';
import { Network } from 'src/types/identity';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { logInteractionEvent } from "../interaction-event-helpers";

@Component({
  selector: 'app-get-deso',
  templateUrl: './get-deso.component.html',
  styleUrls: ['./get-deso.component.scss'],
})
export class GetDesoComponent implements OnInit {
  static STEP_GET_STARTER_DESO = 'step_get_starter_deso';
  static STEP_VERIFY_PHONE_NUMBER = 'step_verify_phone_number';
  static STEP_OBTAIN_DESO = 'step_obtain_deso';

  Network = Network;
  stepScreen: string = GetDesoComponent.STEP_GET_STARTER_DESO;
  GetDesoComponent = GetDesoComponent;
  publicKeyAdded = '';

  environment = environment;

  stepTotal: number;

  publicKeyIsCopied = false;
  scanQRCode = false;

  // user balance
  userBalanceNanos = 0;
  refreshBalanceCooldown = false;
  refreshBalanceRetryTime = 0;
  refreshBalanceInterval: any;

  heroswapIframeUrl: SafeResourceUrl = '';


  constructor(
    public entropyService: EntropyService,
    private cryptoService: CryptoService,
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private textService: TextService,
    private backendAPIService: BackendAPIService,
    private sanitizer: DomSanitizer,
  ) {
    this.stepTotal = globalVars.showJumio() ? 3 : 2;
    if (this.activatedRoute.snapshot.queryParamMap.has('origin')) {
      this.stepTotal = 2;
    }
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      if (queryParams.publicKey) {
        this.publicKeyAdded = queryParams.publicKey;
      }
    });
  }

  ngOnInit(): void {
    if (!environment.heroswapURL) {
      return;
    }
    this.heroswapIframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      [
        environment.heroswapURL,
        '/widget?',
        `network=${this.globalVars.network}`,
        '&destinationTickers=DESO',
        '&destinationTicker=DESO',
        `&destinationAddress=${this.publicKeyAdded || ''}`, // TODO: confirm publicKeyAdded is correct.
        `&affiliateAddress=BC1YLgHhMFnUrzQRpZCpK7TDxVGoGnAk539JqpYWgJ8uW9R7zCCdGHK`,
        `&now=${Date.now()}`,
      ].join('')
    );
    window.addEventListener("message", this.#heroswapMessageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener("message", this.#heroswapMessageListener);
  }

  #heroswapMessageListener = (event: MessageEvent) => {
    if (event.origin !== environment.heroswapURL) return;
    logInteractionEvent("heroswap-iframe", "message", event.data);
  }

  clickTos(): void {
    const h = 700;
    const w = 600;
    const y = window.outerHeight / 2 + window.screenY - h / 2;
    const x = window.outerWidth / 2 + window.screenX - w / 2;

    window.open(
      `${environment.nodeURL}/tos`,
      '',
      `toolbar=no, width=${w}, height=${h}, top=${y}, left=${x}`
    );
  }

  ////// STEP THREE BUTTONS | STEP_GET_STARTER_DESO ///////

  stepThreeNextPhone(): void {
    this.router.navigate(['/', RouteNames.VERIFY_PHONE_NUMBER], {
      queryParams: {public_key: this.publicKeyAdded},
      queryParamsHandling: 'merge',
    });
  }

  stepThreeNextBuy(): void {
    this.router.navigate(['/', RouteNames.BUY_OR_SEND_DESO], {
      queryParamsHandling: 'merge',
    });
  }

  ////// STEP FIVE BUTTONS | STEP_OBTAIN_DESO ///////

  stepFiveNextBuy(): void {
    this.router.navigate(['/', RouteNames.BUY_DESO], {
      queryParamsHandling: 'merge',
    });
  }

  _copyPublicKey(): void {
    this.textService.copyText(this.publicKeyAdded);
    this.publicKeyIsCopied = true;
    setInterval(() => {
      this.publicKeyIsCopied = false;
    }, 1000);
  }

  refreshBalance(): void {
    if (this.refreshBalanceCooldown) {
      return;
    }
    this.refreshBalanceCooldown = true;
    this.refreshBalanceRetryTime = 30;

    this.backendAPIService
      .GetUsersStateless([this.publicKeyAdded], true, true)
      .subscribe((res) => {
        if (!res.UserList.length) {
          return;
        }
        const user = res.UserList[0];
        if (user.BalanceNanos) {
          this.userBalanceNanos = user.BalanceNanos;
        }
      });

    this.refreshBalanceInterval = setInterval(() => {
      if (this.refreshBalanceRetryTime === 0) {
        this.refreshBalanceCooldown = false;
        clearInterval(this.refreshBalanceInterval);
      } else {
        this.refreshBalanceRetryTime--;
      }
    }, 1000);
  }

  ////// FINISH FLOW ///////
  // TODO: decide what the condition should truly be here.
  isFinishFlowDisabled = this.globalVars.derive ? this.userBalanceNanos < 1e4 : false;

  finishFlow(): void {
    if (this.isFinishFlowDisabled) {
      return;
    }
    if (this.globalVars.derive) {
      this.router.navigate(['/', RouteNames.DERIVE], {
        queryParams: {publicKey: this.publicKeyAdded},
        queryParamsHandling: 'merge',
      });
    } else {
      this.login();
    }
  }

  login(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKeyAdded,
      signedUp: this.globalVars.signedUp,
    });
  }

  cancelButtonClicked(): void {
    this.stepScreen = GetDesoComponent.STEP_GET_STARTER_DESO;
  }
}

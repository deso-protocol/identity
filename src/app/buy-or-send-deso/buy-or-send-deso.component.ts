import {Component, OnDestroy, OnInit} from '@angular/core';
import {EntropyService} from '../entropy.service';
import {CryptoService} from '../crypto.service';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {environment} from '../../environments/environment';
import {ActivatedRoute, Router} from '@angular/router';
import {TextService} from '../text.service';
import * as bip39 from 'bip39';
import {RouteNames} from '../app-routing.module';
import {BackendAPIService} from '../backend-api.service';
import { Network } from 'src/types/identity';

@Component({
  selector: 'app-buy-or-send-deso',
  templateUrl: './buy-or-send-deso.component.html',
  styleUrls: ['./buy-or-send-deso.component.scss']
})
export class BuyOrSendDesoComponent implements OnInit {

  Network = Network;
  publicKeyAdded = '';

  environment = environment;

  publicKeyIsCopied = false;
  scanQRCode = false;

  // user balance
  userBalanceNanos = 0;
  refreshBalanceCooldown = false;
  refreshBalanceRetryTime = 0;
  refreshBalanceInterval: any;

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
  ) {
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      if (queryParams.publicKey) {
        this.publicKeyAdded = queryParams.publicKey;
      }
    });
  }

  ngOnInit(): void {
  }

  ////// STEP FIVE BUTTONS | STEP_OBTAIN_DESO ///////

  stepFiveNextBuy(): void {
    this.router.navigate(['/', RouteNames.BUY_DESO], { queryParamsHandling: 'merge'});
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

    this.backendAPIService.GetUsersStateless([this.publicKeyAdded], false)
      .subscribe( res => {
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

  finishFlowTransferDeSo(): void {
    this.finishFlow();
  }

  ////// STEP SIX BUTTONS | STEP_BUY_DESO ///////



  ////// FINISH FLOW ///////
  finishFlow(): void {
    if (this.globalVars.derive) {
      this.router.navigate(['/', RouteNames.DERIVE],
        { queryParams: { publicKey: this.publicKeyAdded }, queryParamsHandling: 'merge' });
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
    this.router.navigate(['/', RouteNames.GET_DESO], { queryParamsHandling: 'merge' });
  }
}

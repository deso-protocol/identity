import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  NgModule,
  OnInit,
  Output,
} from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import { BackendAPIService } from '../../backend-api.service';
import { sprintf } from 'sprintf-js';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SwalHelper } from '../../../lib/helpers/swal-helper';
import Swal from 'sweetalert2';
import { IdentityService } from '../../identity.service';
import { WyreService } from '../../../lib/services/wyre/wyre';
import { isNil } from 'lodash';
import { AccountService } from '../../account.service';
import { TextService } from '../../text.service';
import { SigningService } from '../../signing.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TabSelectorComponent } from '../tab-selector/tab-selector.component';
import { BuyDeSoCompleteComponent } from '../buy-deso-complete/buy-deso-complete.component';
import { BuyDeSoUSDComponent } from '../buy-deso-usd/buy-deso-usd.component';
import { IconsModule } from '../../icons/icons.module';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CryptoService } from '../../crypto.service';
import { SignUpBuyDesoComponent } from '../sign-up-buy-deso.component';
import { AppRoutingModule, RouteNames } from 'src/app/app-routing.module';
import { Network } from '../../../types/identity';
import { BuyDeSoCompletePageComponent } from '../buy-deso-complete-page/buy-deso-complete-page.component';
import { BuyDesoPageComponent } from '../buy-deso-page/buy-deso-page.component';
import { BuyDeSoMegaSwapComponent } from '../buy-deso-megaswap/buy-deso-megaswap.component';

class Messages {
  static INCORRECT_PASSWORD = `The password you entered was incorrect.`;
  static INSUFFICIENT_BALANCE = `Your balance is insufficient to process the transaction.`;
  static CONNECTION_PROBLEM = `We had a problem processing your transaction. Please wait a few minutes and try again.`;
  static UNKOWN_PROBLEM = `There was a weird problem with the transaction. Debug output: %s`;

  static CONFIRM_BUY_DESO = `Are you ready to exchange %s Bitcoin with a fee of %s Bitcoin for %s DeSo?`;
  static ZERO_DESO_ERROR = `You must purchase a non-zero amount DeSo`;
  static NEGATIVE_DESO_ERROR = `You must purchase a non-negative amount of DeSo`;
}

@Component({
  selector: 'buy-deso',
  templateUrl: './buy-deso.component.html',
  styleUrls: ['./buy-deso.component.scss'],
})
export class BuyDeSoComponent implements OnInit {
  static BUY_WITH_USD = 'Buy with Credit Card';
  static BUY_ON_CB = 'Buy on Coinbase';
  static BUY_WITH_MEGASWAP = 'Buy with Crypto';
  static CB_LINK = 'https://www.coinbase.com/price/decentralized-social';

  appData: GlobalVarsService;
  @Input() isModal = false;
  @Input() activeTabInput: string | null = null;
  @Output() closeModal = new EventEmitter();
  @Output() showCloseButton = new EventEmitter<boolean>();

  publicKey = '';

  waitingOnTxnConfirmation = false;
  keyIsCopied = false;

  BuyDeSoComponent = BuyDeSoComponent;
  defaultBuyTabs = [BuyDeSoComponent.BUY_WITH_MEGASWAP, BuyDeSoComponent.BUY_WITH_USD, BuyDeSoComponent.BUY_ON_CB];
  buyTabs = this.defaultBuyTabs;
  activeTab = BuyDeSoComponent.BUY_WITH_MEGASWAP;
  linkTabs = { [BuyDeSoComponent.BUY_ON_CB]: BuyDeSoComponent.CB_LINK };

  satoshisPerDeSoExchangeRate = 0;
  ProtocolUSDCentsPerBitcoinExchangeRate = 0;
  usdPerBitcoinExchangeRate = 0;
  usdPerETHExchangeRate = 0;
  nanosPerETHExchangeRate = 0;
  NanosSold = 0;
  ExchangeUSDCentsPerDeSo = 0;
  USDCentsPerDeSoReservePrice = 0;
  BuyDeSoFeeBasisPoints = 0;
  nanosPerUSDExchangeRate = 0;
  desoToUSDExchangeRateToDisplay = '';
  seedHex = '';

  publicKeyNotInIdentity = false;

  constructor(
    public ref: ChangeDetectorRef,
    public globalVars: GlobalVarsService,
    private backendAPIService: BackendAPIService,
    private identityService: IdentityService,
    private accountService: AccountService,
    private signingService: SigningService,
    private textService: TextService,
    private route: ActivatedRoute,
    public router: Router,
    private httpClient: HttpClient,
    private cryptoService: CryptoService,
    public wyreService: WyreService
  ) {
    this.appData = globalVars;
    this.route.queryParams.subscribe((params: Params) => {
      if (params.publicKey) {
        this.publicKey = params.publicKey;
      }
    });
  }

  cancelButtonClicked(): void {
    this.router.navigate(['/' + RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
    });
  }

  stringify(x: any): any {
    return JSON.stringify(x);
  }

  _alertError(
    err: any,
    showBuyDeSo: boolean = false,
    showBuyCreatorCoin: boolean = false
  ): void {
    if (err === 'Your balance is insufficient.') {
      showBuyDeSo = true;
    }

    SwalHelper.fire({
      target: 'app-sign-up',
      icon: 'error',
      title: `Oops...`,
      html: err,
      showConfirmButton: true,
      showCancelButton: showBuyDeSo || showBuyCreatorCoin,
      focusConfirm: true,
      customClass: {
        confirmButton: 'btn btn-light',
        cancelButton: 'btn btn-light no',
      },
      confirmButtonText: showBuyDeSo
        ? 'Buy DeSo'
        : showBuyCreatorCoin
          ? 'Buy Creator Coin'
          : 'Ok',
      reverseButtons: true,
    });
  }

  _updateDeSoExchangeRate(): void {
    this.backendAPIService.GetExchangeRate().subscribe(
      (res: any) => {
        // BTC
        this.satoshisPerDeSoExchangeRate = res.SatoshisPerDeSoExchangeRate;
        this.ProtocolUSDCentsPerBitcoinExchangeRate =
          res.USDCentsPerBitcoinExchangeRate;
        this.usdPerBitcoinExchangeRate =
          res.USDCentsPerBitcoinExchangeRate / 100;

        // ETH
        this.usdPerETHExchangeRate = res.USDCentsPerETHExchangeRate / 100;
        this.nanosPerETHExchangeRate = res.NanosPerETHExchangeRate;

        // DESO
        this.NanosSold = res.NanosSold;
        this.ExchangeUSDCentsPerDeSo = res.USDCentsPerDeSoExchangeRate;
        this.USDCentsPerDeSoReservePrice =
          res.USDCentsPerDeSoReserveExchangeRate;
        this.BuyDeSoFeeBasisPoints = res.BuyDeSoFeeBasisPoints;

        const nanosPerUnit = GlobalVarsService.NANOS_PER_UNIT;
        this.nanosPerUSDExchangeRate =
          nanosPerUnit / (this.ExchangeUSDCentsPerDeSo / 100);
        this.desoToUSDExchangeRateToDisplay = this.globalVars.nanosToUSD(
          nanosPerUnit,
          null
        );
        this.desoToUSDExchangeRateToDisplay = this.globalVars.nanosToUSD(
          nanosPerUnit,
          2
        );
      },
      (error) => {
        console.error(error);
      }
    );
  }

  ngOnInit(): void {
    const encryptedUser =
      this.accountService.getEncryptedUsers()[this.publicKey];
    // TODO: need some sort of UI for when we can't get encrypted user.
    if (!encryptedUser) {
      console.error('Encrypted User not found: Buying DESO will not work.');
      this.publicKeyNotInIdentity = true;
      return;
    } else {
      this.seedHex = this.cryptoService.decryptSeedHex(
        encryptedUser.encryptedSeedHex,
        this.globalVars.hostname
      );
    }
    window.scroll(0, 0);

    // Add extra tabs
    this.activeTab = BuyDeSoComponent.BUY_WITH_MEGASWAP;

    if (!isNil(this.activeTabInput)) {
      this.activeTab = this.activeTabInput;
    }

    // Force an update of the exchange rate when loading the Buy DeSo page to ensure our computations are using the
    // latest rates.
    this._updateDeSoExchangeRate();
  }

  _handleTabClick(tab: any): void {
    this.activeTab = tab;
  }

  goToLogin(): void {
    this.router.navigate(['/', RouteNames.LOG_IN], {
      queryParamsHandling: 'merge',
    });
  }
}

@NgModule({
  declarations: [
    BuyDeSoComponent,
    TabSelectorComponent,
    BuyDeSoCompleteComponent,
    BuyDeSoUSDComponent,
    BuyDeSoMegaSwapComponent,
    SignUpBuyDesoComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatTooltipModule,
    CommonModule,
    IconsModule,
    AppRoutingModule,
    BsDropdownModule.forRoot(),
  ],
  exports: [BuyDeSoComponent, BuyDeSoCompleteComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BuyDeSoComponentWrapper {}

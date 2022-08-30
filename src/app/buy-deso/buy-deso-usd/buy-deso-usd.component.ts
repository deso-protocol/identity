import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input,
  NgModule,
  OnInit,
} from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import { HttpClient } from '@angular/common/http';
import { WyreService } from '../../../lib/services/wyre/wyre';
import { IdentityService } from '../../identity.service';
import { BackendAPIService } from '../../backend-api.service';
import * as _ from 'lodash';
import Swal from 'sweetalert2';
import { ActivatedRoute, Router } from '@angular/router';
import { SwalHelper } from '../../../lib/helpers/swal-helper';
import { BuyDeSoComponent } from '../buy-deso/buy-deso.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { RouteNames } from '../../app-routing.module';
import { Network } from '../../../types/identity';
const currencyToSymbolMap = require('currency-symbol-map/map');

@Component({
  selector: 'buy-deso-usd',
  templateUrl: './buy-deso-usd.component.html',
  styleUrls: ['./buy-deso-usd.component.scss'],
})
export class BuyDeSoUSDComponent implements OnInit {
  // @ts-ignore
  @Input() parentComponent: BuyDeSoComponent;
  wyreService: WyreService;

  amount = 99;
  quotation: any;
  desoReceived = '';
  fees = 0;

  debouncedGetQuotation: () => void;

  maxUsdAmount = 1000;

  usdEquivalent = 0;
  supportedCountries: string[] = [];
  supportedFiatCurrencies: { [k: string]: string };

  selectedFiatCurrency = 'USD';
  selectedFiatCurrencySymbol = '$';
  selectedCountry = 'US';

  quotationError = '';
  reservationError = '';

  constructor(
    private globalVars: GlobalVarsService,
    private httpClient: HttpClient,
    private identityService: IdentityService,
    private backendApi: BackendAPIService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.wyreService = new WyreService(
      this.httpClient,
      this.globalVars,
      this.backendApi
    );
    this.supportedFiatCurrencies =
      this.wyreService.getSupportedFiatCurrencies();
    this.wyreService.getSupportedCountries().subscribe((res) => {
      this.supportedCountries = res;
    });
    this.debouncedGetQuotation = _.debounce(
      this._refreshQuotation.bind(this),
      300
    );
    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams.destAmount) {
        const btcPurchased = queryParams.destAmount;
        SwalHelper.fire({
          target: 'buy-deso-usd',
          icon: 'success',
          title: `Purchase Completed`,
          html: `Your purchase of approximately ${this.getDeSoReceived(
            btcPurchased
          ).toFixed(
            4
          )} DeSo was successful. It may take a few minutes to appear in your wallet.`,
          showConfirmButton: true,
          showCancelButton: true,
          reverseButtons: true,
          customClass: {
            confirmButton: 'btn btn-light',
            cancelButton: 'btn btn-light no',
          },
          confirmButtonText: 'Continue to Feed ',
          cancelButtonText: 'Buy More',
        }).then((res) => {
          console.log('FINISH USD FLOW! res.isConfirmed:', res.isConfirmed);
          // FIXME: do things here
        });
      }
    });
  }

  ngOnInit(): void {
    this._refreshQuotation();
  }

  onBuyClicked(): void {
    if (this.quotationError) {
      return;
    }
    this.wyreService
      .makeWalletOrderReservation(
        this.parentComponent.publicKey,
        this.amount,
        this.selectedCountry,
        this.selectedFiatCurrency,
        `${environment.hostname}/${RouteNames.BUY_COMPLETE}?publicKey=${
          this.parentComponent.publicKey
        }&signedUp=${this.globalVars.signedUp}${
          this.globalVars.network === Network.testnet ? '&testnet=true' : ''
        }`
      )
      .subscribe(
        (res) => {
          const wyreUrl = res.url;
          if (res.url) {
            Swal.fire({
              target: 'buy-deso-usd',
              title: 'Purchase $DESO',
              html: `You will complete your purchase through Wyre. Your ${this.selectedFiatCurrency} will be converted to <b>Bitcoin</b> and then into <b>$DESO</b> automatically.`,
              showCancelButton: true,
              showConfirmButton: true,
              confirmButtonText: 'Buy',
              customClass: {
                confirmButton: 'btn btn-light',
                cancelButton: 'btn btn-light no',
              },
              reverseButtons: true,
            }).then((res: any) => {
              if (res.isConfirmed) {
                window.location.href = wyreUrl;
              }
            });
          } else {
            this.reservationError = res.message;
            this.parentComponent._alertError(res.message);
          }
        },
        (err) => {
          this.parentComponent._alertError(err.error.message);
        }
      );
  }

  updateQuotation(): void {
    this.debouncedGetQuotation();
  }

  _refreshQuotation(): void {
    this.desoReceived = '';
    this.fees = 0;
    this.quotation = null;
    this.usdEquivalent = 0;
    this.quotationError = '';
    this.wyreService
      .makeWalletOrderQuotation(
        this.amount,
        this.selectedCountry,
        this.selectedFiatCurrency
      )
      .subscribe(
        (res) => {
          this.parseQuotation(res);
        },
        (err) => {
          this.quotationError = err.error.message;
        }
      );
  }

  parseQuotation(quotation: any): void {
    if (quotation.errorCode || quotation.message) {
      this.quotationError = quotation.message;
      return;
    }
    this.quotation = quotation;
    this.usdEquivalent = this.getUSDEquivalent(quotation);

    if (this.usdEquivalent > this.maxUsdAmount) {
      this.quotationError = `Maximum purchase amount is ${this.maxUsdAmount} USD`;
      return;
    }
    this.desoReceived = this.getDeSoReceived(quotation.destAmount).toFixed(4);
    this.fees = quotation.sourceAmount - quotation.sourceAmountWithoutFees;
  }

  getDeSoReceived(btcReceived: number): number {
    return (
      (btcReceived * 1e8) /
      (this.parentComponent.satoshisPerDeSoExchangeRate *
        (1 + this.parentComponent.BuyDeSoFeeBasisPoints / (100 * 100)))
    );
  }

  onSelectFiatCurrency(event: any): void {
    this.selectedFiatCurrency = event;
    this.selectedFiatCurrencySymbol = currencyToSymbolMap[event];
    this._refreshQuotation();
  }

  onSelectCountry(event: any): void {
    this.selectedCountry = event;
    this._refreshQuotation();
  }

  getUSDEquivalent(quotation: any): any {
    return quotation.equivalencies.USD;
  }
}

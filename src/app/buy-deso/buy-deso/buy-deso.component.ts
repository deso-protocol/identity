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
import { BuyDeSoEthComponent } from '../buy-deso-eth/buy-deso-eth.component';
import { BuyDeSoUSDComponent } from '../buy-deso-usd/buy-deso-usd.component';
import { IconsModule } from '../../icons/icons.module';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { CryptoService } from '../../crypto.service';
import { SignUpBuyDesoComponent } from '../sign-up-buy-deso.component';
import { RouteNames } from 'src/app/app-routing.module';
import { Network } from '../../../types/identity';
import { BuyDeSoCompletePageComponent } from '../buy-deso-complete-page/buy-deso-complete-page.component';
import { BuyDesoPageComponent } from '../buy-deso-page/buy-deso-page.component';

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
  static BUY_WITH_BTC = 'Buy with Bitcoin';
  static BUY_WITH_ETH = 'Buy with Ethereum';
  static BUY_ON_CB = 'Buy on Coinbase';
  static CB_LINK = 'https://www.coinbase.com/price/decentralized-social';

  appData: GlobalVarsService;
  @Input() isModal = false;
  @Input() activeTabInput: string | null = null;
  @Output() closeModal = new EventEmitter();
  @Output() showCloseButton = new EventEmitter<boolean>();

  publicKey = '';

  waitingOnTxnConfirmation = false;
  queryingBitcoinAPI = false;
  buyWithBTCStep = 1;
  keyIsCopied = false;

  BuyDeSoComponent = BuyDeSoComponent;
  latestBitcoinAPIResponse: any = null;

  buyTabs = [BuyDeSoComponent.BUY_WITH_BTC];
  activeTab = BuyDeSoComponent.BUY_WITH_BTC;
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

  buyDeSoFields = {
    desoToBuy: '',
    bitcoinToExchange: '',
    bitcoinTransactionFeeRateSatoshisPerKB: 1000 * 1000,
    bitcoinTotalTransactionFeeSatoshis: '0',
    error: '',
  };

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
      if (params.btc) {
        this.activeTab = BuyDeSoComponent.BUY_WITH_BTC;
        this.router.navigate([], { queryParamsHandling: 'merge' });
      }
      if (params.publicKey) {
        this.publicKey = params.publicKey;
      }
    });
  }

  btcDepositAddress(): string {
    const user = this.accountService.getEncryptedUsers()[this.publicKey];
    if (user) {
      return user.btcDepositAddress;
    }
    return '';
  }

  onBuyMoreDeSoClicked(): void {
    this._queryBitcoinAPI();
    this.buyWithBTCStep = 1;
  }

  stepOneTooltip(): string {
    return (
      'DESO can be purchased in just a few minutes using Bitcoin.\n\n' +
      'To get started, simply send Bitcoin to your deposit address below. Note that deposits should show up ' +
      'within thirty seconds or so but sometimes, for various technical reasons, it can take up to an hour ' +
      '(though this should be extremely rare).\n\n' +
      "Once you've deposited Bitcoin, you can swap it for DESO in step two below. If it's your first " +
      'time doing this, we recommend starting with a small test amount of Bitcoin to get comfortable with the flow.'
    );
  }

  depositBitcoinTooltip(): string {
    return 'Send Bitcoin to this address so that you can swap it for DESO in step two below.';
  }

  minDepositTooltip(): string {
    return (
      'This is the minimum amount required to cover the Bitcoin ' +
      'network fees associated with your purchase. We would love to make this ' +
      'lower, but if we did then the Bitcoin network would reject your transaction.'
    );
  }

  withdrawBitcoinTooltip(): string {
    return (
      'If you send too much Bitcoin to your deposit address and need to get it back, you ' +
      'can access the Bitcoin in this address by importing your DeSo seed phrase into most standard Bitcoin wallets ' +
      "like Electrum and choosing m/44'/0'/0'/0/0 as your derivation path. This works because your DeSo seed phrase is " +
      "what's used to generate your Bitcoin deposit address."
    );
  }

  balanceUpdateTooltip(): string {
    return (
      'Normally, when you send Bitcoin to the deposit address, it will show up instantly. ' +
      'However, it can take up to an hour in rare cases depending on where you send it from.'
    );
  }

  bitcoinNetworkFeeTooltip(): string {
    return (
      'The process of exchanging Bitcoin for DeSo requires posting a transaction to ' +
      'the Bitcoin blockchain. For this reason, we must add a network fee to ' +
      'incentivize miners to process the transaction.'
    );
  }

  cancelButtonClicked(): void {
    this.router.navigate(['/' + RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
    });
  }

  _copyPublicKey(): void {
    this.textService.copyText(this.btcDepositAddress());
    this.keyIsCopied = true;
    setInterval(() => {
      this.keyIsCopied = false;
    }, 1000);
  }

  _extractBurnError(err: any): string {
    if (err.error != null && err.error.error != null) {
      // Is it obvious yet that I'm not a frontend gal?
      // TODO: Error handling between BE and FE needs a major redesign.
      const rawError = err.error.error;
      if (rawError.includes('password')) {
        return Messages.INCORRECT_PASSWORD;
      } else if (rawError.includes('not sufficient')) {
        return Messages.INSUFFICIENT_BALANCE;
      } else if (rawError.includes('so high')) {
        return `The amount of Bitcoin you've deposited is too low. Please deposit at least ${(
          (this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB * 0.3) /
          1e8
        ).toFixed(4)} Bitcoin.`;
      } else if (rawError.includes('total=0')) {
        return `You must purchase a non-zero amount of DeSo.`;
      } else if (rawError.includes('You must burn at least .0001 Bitcoins')) {
        return `You must exchange at least  ${(
          (this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB * 0.3) /
          1e8
        ).toFixed(4)} Bitcoin.`;
      } else {
        return rawError;
      }
    }
    if (err.status != null && err.status !== 200) {
      return Messages.CONNECTION_PROBLEM;
    }
    // If we get here we have no idea what went wrong so just return the
    // errorString.
    return sprintf(Messages.UNKOWN_PROBLEM, JSON.stringify(err));
  }

  _updateBitcoinFee(bitcoinToExchange: number): Promise<any> | null {
    if (this.latestBitcoinAPIResponse == null) {
      SwalHelper.fire({
        target: 'app-sign-up',
        icon: 'error',
        title: `Oops...`,
        html: `Please wait for at least one balance update before hitting this button.`,
        showConfirmButton: true,
        showCancelButton: false,
        focusConfirm: true,
        customClass: {
          confirmButton: 'btn btn-light',
          cancelButton: 'btn btn-light no',
        },
      });

      return null;
    }

    // Update the total fee to account for the extra Bitcoin.
    return this.backendAPIService
      .ExchangeBitcoin(
        this.latestBitcoinAPIResponse,
        this.btcDepositAddress(),
        this.publicKey,
        Math.floor(bitcoinToExchange * 1e8),
        Math.floor(this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB),
        [],
        false
      )
      .toPromise()
      .then(
        (res) => {
          if (res == null || res.FeeSatoshis == null) {
            this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis = '0';
            this.buyDeSoFields.error = Messages.UNKOWN_PROBLEM;
            return null;
          }
          this.buyDeSoFields.error = '';
          this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis =
            res.FeeSatoshis;
          return res;
        },
        (err) => {
          console.error('Problem updating Bitcoin fee Satoshis Per KB', err);
        }
      );
  }

  stringify(x: any): any {
    return JSON.stringify(x);
  }

  _numPendingTxns(txnObj: any): number {
    if (txnObj == null) {
      return 0;
    }
    return Object.keys(txnObj).length;
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

  _clickBuyDeSo(): void {
    if (this.appData == null || this.publicKey == null) {
      return;
    }

    if (
      this.buyDeSoFields.desoToBuy === '' ||
      parseFloat(this.buyDeSoFields.desoToBuy) === 0
    ) {
      this._alertError(Messages.ZERO_DESO_ERROR);
      return;
    }
    if (parseFloat(this.buyDeSoFields.desoToBuy) < 0) {
      this._alertError(Messages.NEGATIVE_DESO_ERROR);
      return;
    }

    if (this.buyDeSoFields.error != null && this.buyDeSoFields.error !== '') {
      this._alertError(this.buyDeSoFields.error);
      return;
    }

    const confirmBuyDeSoString = sprintf(
      Messages.CONFIRM_BUY_DESO,
      this.buyDeSoFields.bitcoinToExchange,
      (
        parseFloat(this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis) / 1e8
      ).toFixed(8),
      this.buyDeSoFields.desoToBuy
    );

    SwalHelper.fire({
      target: 'app-sign-up',
      title: 'Are you ready?',
      html: confirmBuyDeSoString,
      showCancelButton: true,
      customClass: {
        confirmButton: 'btn btn-light',
        cancelButton: 'btn btn-light no',
      },
      reverseButtons: true,
    }).then((res: any) => {
      if (res.isConfirmed) {
        // Execute the buy
        this.waitingOnTxnConfirmation = true;
        this.showCloseButton.emit(false);

        return this.backendAPIService
          .ExchangeBitcoin(
            this.latestBitcoinAPIResponse,
            this.btcDepositAddress(),
            this.publicKey,
            Math.floor(parseFloat(this.buyDeSoFields.bitcoinToExchange) * 1e8),
            Math.floor(
              this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB
            ),
            [],
            false
          )
          .toPromise()
          .then(
            // tslint:disable-next-line:no-shadowed-variable
            (res: any) => {
              // I think it is okay to sign this hash without additional validation, considering this flow only happens on
              // signup. Even if somehow this hash we're signing is mallicious, the user has no funds yet.
              const hashes = this.signingService.signHashes(
                this.seedHex,
                res.UnsignedHashes
              );
              if (hashes.length) {
                this.backendAPIService
                  .ExchangeBitcoin(
                    this.latestBitcoinAPIResponse,
                    this.btcDepositAddress(),
                    this.publicKey,
                    Math.floor(
                      parseFloat(this.buyDeSoFields.bitcoinToExchange) * 1e8
                    ),
                    Math.floor(
                      this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB
                    ),
                    hashes,
                    true
                  )
                  .toPromise()
                  .then(
                    // tslint:disable-next-line:no-shadowed-variable
                    (res: any) => {
                      if (res == null || res.FeeSatoshis == null) {
                        this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis =
                          '0';
                        this.buyDeSoFields.error = Messages.UNKOWN_PROBLEM;
                        this.showCloseButton.emit(true);
                        return null;
                      }

                      // Reset all the form fields and run a BitcoinAPI update
                      this.buyDeSoFields.error = '';
                      this.buyDeSoFields.desoToBuy = '';
                      this.buyDeSoFields.bitcoinToExchange = '';
                      this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis =
                        '0';
                      // Update the BitcoinAPIResponse
                      this.latestBitcoinAPIResponse = null;

                      // This will update the balance and a bunch of other things.
                      this.waitForTransaction(res.DeSoTxnHashHex);
                      return res;
                    },
                    (err) => {
                      console.error(
                        'Problem updating Bitcoin fee Satoshis Per KB',
                        err
                      );
                      this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis =
                        '0';
                      this.buyDeSoFields.error = this._extractBurnError(err);
                      this.waitingOnTxnConfirmation = false;
                      return null;
                    }
                  );
              }
            },
            (err) => {
              console.error(
                'Problem updating Bitcoin fee Satoshis Per KB',
                err
              );
            }
          );
      }
      return null;
    });
  }

  waitForTransaction(waitTxn: string): void {
    if (waitTxn !== '') {
      let attempts = 0;
      const numTries = 160;
      const timeoutMillis = 750;
      // Set an interval to repeat
      const interval = setInterval(() => {
        if (attempts >= numTries) {
          this._clickBuyDeSoSuccessButTimeout(this);
          clearInterval(interval);
          return;
        }
        this.backendAPIService
          .GetTxn(waitTxn)
          .subscribe(
            (res: any) => {
              if (!res.TxnFound) {
                return;
              }
              this._updateDeSoExchangeRate();
              this._clickBuyDeSoSuccess(this);
              clearInterval(interval);
            },
            (error) => {
              this._clickBuyDeSoSuccessButTimeout(this);
              clearInterval(interval);
            }
          )
          .add(() => attempts++);
      }, timeoutMillis) as any;
    }
  }

  _alertSuccess(val: any, altTitle?: string, funcAfter?: any): void {
    let title = `Success!`;
    if (altTitle) {
      title = altTitle;
    }
    SwalHelper.fire({
      target: `app-sign-up`,
      icon: 'success',
      title,
      html: val,
      showConfirmButton: true,
      focusConfirm: true,
      customClass: {
        confirmButton: 'btn btn-light',
        cancelButton: 'btn btn-light no',
      },
    }).then((res: any) => {
      if (funcAfter) {
        funcAfter();
      }
    });
  }

  _clickBuyDeSoSuccess(comp: BuyDeSoComponent): void {
    comp.waitingOnTxnConfirmation = false;
    comp.showCloseButton.emit(true);
    comp.router.navigate(['/', RouteNames.BUY_COMPLETE], {
      queryParamsHandling: 'merge',
    });
    comp.ref.detectChanges();

    console.log('NOW SHOULD CLOSE IDENTITY');
  }

  _clickBuyDeSoSuccessButTimeout(comp: BuyDeSoComponent): void {
    comp.waitingOnTxnConfirmation = false;
    comp.showCloseButton.emit(true);
    const errString =
      'Your DeSo purchase was successfully broadcast. Due to high load' +
      ' your balance may take up to half an hour to show up in your wallet. Please ' +
      " check back and hit the 'help' button if you have any problems.";
    comp._alertSuccess(errString);
  }

  _clickBuyDeSoFailure(comp: BuyDeSoComponent, errString: string): void {
    comp.waitingOnTxnConfirmation = false;
    comp.showCloseButton.emit(true);
    // The error about "replace by fee" has a link in it, and we want that link
    // to render. There is no risk of injection here.
    if (errString && errString.indexOf('replace by fee') >= 0) {
      // TODO: We should add some kind of htmlSafe attribute or something to
      // do this rather than creating a potentially-insecure if statement as
      // we do here.
      Swal.fire({
        target: `app-sign-up`,
        icon: 'info',
        title: `Almost there!`,
        html: errString,
        showConfirmButton: true,
        focusConfirm: true,
        customClass: {
          confirmButton: 'btn btn-light',
          cancelButton: 'btn btn-light no',
        },
      });
      return;
    }
    this._alertError(errString);
  }

  _clickMaxDeSo(): void {
    const update = this._updateBitcoinFee(-1);
    if (update !== null) {
      update.then(
        (res) => {
          if (res == null || res.BurnAmountSatoshis == null) {
            return;
          }

          // The fee should have been updated by the time we get here so
          // just update the Bitcoin and DeSo amounts.
          this.buyDeSoFields.bitcoinToExchange = (
            res.BurnAmountSatoshis / 1e8
          ).toFixed(8);
          this._updateBitcoinToExchange(this.buyDeSoFields.bitcoinToExchange);
        },
        (err) => {
          // The error should have been set by the time we get here.
        }
      );
    }
  }

  _computeSatoshisToBurnGivenDeSoNanos(amountNanos: number): number {
    if (!this.satoshisPerDeSoExchangeRate) {
      SwalHelper.fire({
        target: 'app-sign-up',
        icon: 'error',
        title: `Oops...`,
        html: `We're still fetching some exchange rate data. Try again in about ten seconds.`,
        showConfirmButton: true,
        showCancelButton: false,
        focusConfirm: true,
        customClass: {
          confirmButton: 'btn btn-light',
          cancelButton: 'btn btn-light no',
        },
      });

      return 0;
    }

    const amountDESO = amountNanos / 1e9;

    return (
      amountDESO *
      (this.satoshisPerDeSoExchangeRate *
        (1 + this.BuyDeSoFeeBasisPoints / (100 * 100)))
    );
  }

  _computeNanosToCreateGivenSatoshisToBurn(satoshisToBurn: number): number {
    // Account for the case where we haven't fetched the protocol exchange rate yet.
    // For some reason this was taking 20 seconds in prod...
    if (!this.satoshisPerDeSoExchangeRate) {
      SwalHelper.fire({
        target: 'app-sign-up',
        icon: 'error',
        title: `Oops...`,
        html: `We're still fetching some exchange rate data. Try again in about ten seconds.`,
        showConfirmButton: true,
        showCancelButton: false,
        focusConfirm: true,
        customClass: {
          confirmButton: 'btn btn-light',
          cancelButton: 'btn btn-light no',
        },
      });

      return 0;
    }
    return (
      (satoshisToBurn /
        (this.satoshisPerDeSoExchangeRate *
          (1 + this.BuyDeSoFeeBasisPoints / (100 * 100)))) *
      1e9
    );
  }

  _updateDeSoToBuy(newVal: any): void {
    if (newVal == null || newVal === '') {
      this.buyDeSoFields.desoToBuy = '';
      this.buyDeSoFields.bitcoinToExchange = '';
    } else {
      // The .999 factor comes in due to having to consider BitcoinExchangeFeeBasisPoints
      // that goes to pay the miner.
      this.buyDeSoFields.bitcoinToExchange = (
        this._computeSatoshisToBurnGivenDeSoNanos(newVal * 1e9) / 1e8
      ).toFixed(8);
    }

    // Update the Bitcoin fee.
    this._updateBitcoinFee(parseFloat(this.buyDeSoFields.bitcoinToExchange));
  }

  _updateBitcoinToExchange(newVal: any): void {
    if (newVal == null || newVal === '') {
      this.buyDeSoFields.bitcoinToExchange = '';
      this.buyDeSoFields.desoToBuy = '';
    } else {
      // Compute the amount of DeSo the user can buy for this amount of Bitcoin and
      // set it.
      //
      // The .999 factor comes in due to having to consider BitcoinExchangeFeeBasisPoints
      // that goes to pay the miner.
      this.buyDeSoFields.desoToBuy = (
        this._computeNanosToCreateGivenSatoshisToBurn(
          parseFloat(this.buyDeSoFields.bitcoinToExchange) * 1e8
        ) / 1e9
      ).toFixed(9);
    }

    // Update the Bitcoin fee.
    this._updateBitcoinFee(parseFloat(this.buyDeSoFields.bitcoinToExchange));
  }

  _bitcoinToExchangeNumber(): number {
    return parseFloat(this.buyDeSoFields.bitcoinToExchange);
  }

  _bitcoinTotalTransactionFeeSatoshisNumber(): number {
    return parseFloat(this.buyDeSoFields.bitcoinTotalTransactionFeeSatoshis);
  }

  _queryBitcoinAPI(): void {
    // If we are already querying the bitcoin API, abort mission!
    if (this.queryingBitcoinAPI) {
      return;
    }

    this.latestBitcoinAPIResponse = null;
    this.queryingBitcoinAPI = true;

    this.backendAPIService
      .GetBitcoinAPIInfo(
        this.btcDepositAddress(),
        this.globalVars.network === Network.testnet
      )
      .subscribe(
        (resProm: any) => {
          resProm
            .then((res: any) => {
              this.latestBitcoinAPIResponse = res;

              this.queryingBitcoinAPI = false;
            })
            .catch(() => {
              this.queryingBitcoinAPI = false;
            });
        },
        (error) => {
          this.queryingBitcoinAPI = false;
          console.error('Error getting BitcoinAPI data: ', error);
        }
      );
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
    this.activeTab = BuyDeSoComponent.BUY_WITH_ETH;
    this.buyTabs.unshift(BuyDeSoComponent.BUY_WITH_ETH);
    this.buyTabs.push(BuyDeSoComponent.BUY_WITH_USD);
    this.buyTabs.push(BuyDeSoComponent.BUY_ON_CB);

    if (!isNil(this.activeTabInput)) {
      this.activeTab = this.activeTabInput;
    }

    // Query the website to get the fees.
    this.backendAPIService.GetBitcoinFeeRateSatoshisPerKB().subscribe(
      (res: any) => {
        if (res.priority != null) {
          this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB =
            2.0 * res.priority * 1000;
          // console.log('Using Bitcoin sats/KB fee: ', this.buyDeSoFields.bitcoinTransactionFeeRateSatoshisPerKB)
        } else {
          console.error(
            "res.priority was null so didn't set default fee: ",
            res
          );
        }
      },
      (error) => {
        console.error('Problem getting Bitcoin fee: ', error);
      }
    );

    this._queryBitcoinAPI();
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
    BuyDeSoEthComponent,
    BuyDeSoUSDComponent,
    SignUpBuyDesoComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MatTooltipModule,
    CommonModule,
    IconsModule,
    BsDropdownModule.forRoot(),
  ],
  exports: [BuyDeSoComponent, BuyDeSoCompleteComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BuyDeSoComponentWrapper {}

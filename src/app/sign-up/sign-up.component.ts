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
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit, OnDestroy {
  static STEP_GENERATE_SEED = 'step_generate_seed';
  static STEP_VERIFY_SEED = 'step_verify_seed';
  static STEP_GET_STARTER_DESO = 'step_get_starter_deso';
  static STEP_VERIFY_PHONE_NUMBER = 'step_verify_phone_number';
  static STEP_OBTAIN_DESO = 'step_obtain_deso';
  static STEP_BUY_DESO = 'step_buy_deso';

  Network = Network;
  stepScreen: string = SignUpComponent.STEP_GENERATE_SEED;
  SignUpComponent = SignUpComponent;
  seedHex = '';
  seedCopied = false;
  mnemonicCheck = '';
  extraTextCheck = '';
  publicKeyAdded = '';

  // Advanced tab
  advancedOpen = false;
  showMnemonicError = false;
  showEntropyHexError = false;

  loginMessagePayload: any;
  environment = environment;

  stepTotal: number;
  phoneNumberSuccess = false;

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
    this.stepTotal = globalVars.showJumio() ? 3 : 2;
    if (this.activatedRoute.snapshot.queryParamMap.has('origin')) {
      this.stepTotal = 2;
    }
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Set new entropy for the next time they go through the flow.
    this.entropyService.setNewTemporaryEntropy();
    this.entropyService.advancedOpen = false;
  }

  ////// STEP ONE BUTTONS | STEP_GENERATE_SEED ///////

  stepOneCopy(): void {
    this.textService.copyText(this.entropyService.temporaryEntropy?.mnemonic || '');
    this.seedCopied = true;
  }

  stepOneDownload(): void {
    const contents = `${this.entropyService.temporaryEntropy?.mnemonic}\n\n${this.entropyService.temporaryEntropy?.extraText}`;
    this.textService.downloadText(contents, 'deso-seed.txt');
  }

  stepOnePrint(): void {
    window.print();
  }

  stepOneNext(): void {
    this.stepScreen = SignUpComponent.STEP_VERIFY_SEED;
    this.seedCopied = false; // Reset the copy icon.
  }

  clickTos(): void {
    const h = 700;
    const w = 600;
    const y = window.outerHeight / 2 + window.screenY - h / 2;
    const x = window.outerWidth / 2 + window.screenX - w / 2;

    window.open(`${environment.nodeURL}/tos`, '', `toolbar=no, width=${w}, height=${h}, top=${y}, left=${x}`);
  }

  ////// STEP TWO BUTTONS | STEP_VERIFY_SEED ///////

  stepTwoNext(): void {
    // Add the new user to the account service registry.
    const network = this.globalVars.network;
    const mnemonic = this.mnemonicCheck;
    const extraText = this.extraTextCheck;
    const keychain = this.cryptoService.mnemonicToKeychain(mnemonic, extraText);
    this.seedHex = this.cryptoService.keychainToSeedHex(keychain);
    this.publicKeyAdded = this.accountService.addUser(keychain, mnemonic, extraText, network);

    this.accountService.setAccessLevel(
      this.publicKeyAdded, this.globalVars.hostname, this.globalVars.accessLevelRequest);

    this.stepScreen = SignUpComponent.STEP_GET_STARTER_DESO;
  }

  stepTwoBack(): void {
    this.extraTextCheck = '';
    this.mnemonicCheck = '';
    this.stepScreen = SignUpComponent.STEP_GENERATE_SEED;
  }

  ////// STEP THREE BUTTONS | STEP_GET_STARTER_DESO ///////

  stepThreeNextPhone(): void {
    this.stepScreen = SignUpComponent.STEP_VERIFY_PHONE_NUMBER;
  }


  stepThreeNextBuy(): void {
    this.stepScreen = SignUpComponent.STEP_OBTAIN_DESO;
  }

  ////// STEP FOUR BUTTONS | STEP_VERIFY_PHONE_NUMBER ///////

  phoneNumberVerified(): void {
    // Note: phoneNumberSuccess is only passed on login. That is if origin of this flow was /derive, and the user
    //  created a new account and verified phone number, then we don't pass phoneNumberSuccess.
    this.phoneNumberSuccess = true;
  }

  finishFlowPhoneNumber(): void {
    this.finishFlow();
  }

  finishFlowPhoneNumberSkip(): void {
    this.finishFlow();
  }

  ////// STEP FIVE BUTTONS | STEP_OBTAIN_DESO ///////

  stepFiveNextBuy(): void {
    this.stepScreen = SignUpComponent.STEP_BUY_DESO;
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
      this.identityService.derive({
        publicKey: this.publicKeyAdded,
      });
    } else {
      this.login();
    }
  }

  login(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKeyAdded,
      signedUp: true,
      phoneNumberSuccess: this.phoneNumberSuccess,
    });
  }

  ////// ENTROPY //////

  checkMnemonic(): void {
    this.showMnemonicError = !this.entropyService.isValidMnemonic(this.entropyService.temporaryEntropy.mnemonic);
    if (this.showMnemonicError) { return; }

    // Convert the mnemonic into new entropy hex.
    const entropy = bip39.mnemonicToEntropy(this.entropyService.temporaryEntropy.mnemonic);
    this.entropyService.temporaryEntropy.customEntropyHex = entropy.toString();
  }

  checkEntropyHex(): void {
    this.showEntropyHexError = !this.entropyService.isValidCustomEntropyHex(this.entropyService.temporaryEntropy.customEntropyHex);
    if (this.showEntropyHexError) { return; }

    // Convert entropy into new mnemonic.
    const entropy = new Buffer(this.entropyService.temporaryEntropy.customEntropyHex, 'hex');
    this.entropyService.temporaryEntropy.mnemonic = bip39.entropyToMnemonic(entropy);
  }

  normalizeExtraText(): void {
    this.entropyService.temporaryEntropy.extraText = this.entropyService.temporaryEntropy.extraText.normalize('NFKD');
  }

  hasEntropyError(): boolean {
    return this.showEntropyHexError || this.showMnemonicError;
  }

  getNewEntropy(): void {
    this.entropyService.setNewTemporaryEntropy();
  }
}

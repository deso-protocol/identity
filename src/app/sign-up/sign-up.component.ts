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

  publicKeyIsCopied = false;
  scanQRCode = false;

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

    if (this.globalVars.getFreeDeso) {
      this.globalVars.signedUp = true;
      this.router.navigate(['/', RouteNames.GET_DESO], {
        queryParams: {publicKey: this.publicKeyAdded, signedUp: true },
        queryParamsHandling: 'merge'});
    } else {
      this.identityService.login({
        users: this.accountService.getEncryptedUsers(),
        publicKeyAdded: this.publicKeyAdded,
        signedUp: true,
      });
    }
  }

  stepTwoBack(): void {
    this.extraTextCheck = '';
    this.mnemonicCheck = '';
    this.stepScreen = SignUpComponent.STEP_GENERATE_SEED;
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

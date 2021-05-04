import {Component, OnDestroy, OnInit} from '@angular/core';
import {EntropyService} from '../entropy.service';
import {CryptoService} from '../crypto.service';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {environment} from '../../environments/environment';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit, OnDestroy {
  stepNum = 1;
  seedCopied = false;
  advancedOpen = false;
  mnemonicCheck = '';
  extraTextCheck = '';
  hasAdvancedEntropyError = false;
  publicKeyAdded = '';

  constructor(
    public entropyService: EntropyService,
    private cryptoService: CryptoService,
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Set new entropy for the next time they go through the flow.
    this.entropyService.setNewTemporaryEntropy();
    this.entropyService.advancedOpen = false;
  }

  ////// STEP ONE BUTTONS ///////

  stepOneCopy(): void {
    this.copyText(this.entropyService.temporaryEntropy?.mnemonic || '');
    this.seedCopied = true;
  }

  stepOneDownload(): void {
    const contents = encodeURIComponent(`${this.entropyService.temporaryEntropy?.mnemonic}\n\n${this.entropyService.temporaryEntropy?.extraText}`);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + contents);
    element.setAttribute('download', 'bitclout-seed.txt');
    element.style.display = 'none';

    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  stepOnePrint(): void {
    window.print();
  }

  stepOneNext(): void {
    this.stepNum = 2;
    this.seedCopied = false; // Reset the copy icon.
  }

  ////// STEP TWO BUTTONS ///////

  stepTwoNext(): void {
    const network = this.globalVars.network;
    const keychain = this.cryptoService.mnemonicToKeychain(this.mnemonicCheck, this.extraTextCheck);
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);

    this.publicKeyAdded = this.accountService.addUser({
      seedHex,
      mnemonic: this.mnemonicCheck,
      extraText: this.extraTextCheck,
      btcDepositAddress,
      network,
    });

    // TODO: handle sign-ups on 3rd party nodes properly
    if (this.globalVars.isFullAccessHostname()) {
      this.completeFlow();
    } else {
      this.stepNum = 3;
    }
  }

  stepTwoBack(): void {
    this.extraTextCheck = "";
    this.mnemonicCheck = "";
    this.stepNum = 1;
  }

  clickSignup(): void {
    this.accountService.setAccessLevel(this.publicKeyAdded, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.completeFlow();
  }

  clickTos(): void {
    const h = 700;
    const w = 600;
    const y = window.outerHeight / 2 + window.screenY - h / 2;
    const x = window.outerWidth / 2 + window.screenX - w / 2;

    window.open(`https://${environment.nodeHostname}/tos`, '', `toolbar=no, width=${w}, height=${h}, top=${y}, left=${x}`);
  }

  completeFlow(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKeyAdded,
      signedUp: true
    });
  }

  copyText(val: string): void {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }
}

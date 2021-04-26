import {Component, OnInit, Input, ChangeDetectorRef, Output, EventEmitter, OnChanges} from '@angular/core';
import { TemporaryEntropy, EntropyService } from '../entropy.service'
import * as bip39 from 'bip39';


@Component({
  selector: 'app-sign-up-entropy',
  templateUrl: './sign-up-entropy.component.html',
  styleUrls: ['./sign-up-entropy.component.scss']
})
export class SignUpEntropyComponent implements OnInit, OnChanges {
  showMnemonicError = false;
  showEntropyHexError = false;

  constructor( public entropyService: EntropyService ) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: any): void {
  }

  checkMnemonicAndMaybeEmit(): void {
    this.showMnemonicError =
      !this.entropyService.isValidMnemonic(this.entropyService.temporaryEntropy.mnemonic);
    if (this.showMnemonicError) { return; }

    // Convert the mnemonic into new entropy hex.
    const entropy = bip39.mnemonicToEntropy(this.entropyService.temporaryEntropy.mnemonic);
    const hexEntropy = entropy.toString();
    this.entropyService.temporaryEntropy.customEntropyHex = hexEntropy;
  }

  checkEntropyHexAndMaybeEmit(): void {
    this.showEntropyHexError =
      !this.entropyService.isValidCustomEntropyHex(this.entropyService.temporaryEntropy.customEntropyHex);
    if (this.showEntropyHexError) { return; }

    // Convert entropy into new mnemonic.
    const entropy = new Buffer(this.entropyService.temporaryEntropy.customEntropyHex, 'hex');
    const mnemonic = bip39.entropyToMnemonic(entropy);
    this.entropyService.temporaryEntropy.mnemonic = mnemonic;
  }

  normalizeExtraTextAndEmit(): void {
    // Normalize extra text.
    this.entropyService.temporaryEntropy.extraText = this.entropyService.temporaryEntropy.extraText.normalize('NFKD');
  }

  setErrorState(): void {
    this.showEntropyHexError =
      !this.entropyService.isValidCustomEntropyHex(this.entropyService.temporaryEntropy.customEntropyHex);
    this.showMnemonicError =
      !this.entropyService.isValidMnemonic(this.entropyService.temporaryEntropy.mnemonic);
  }

  getNewEntropy(): void {
    this.entropyService.setNewTemporaryEntropy();
  }
}

import { Injectable } from '@angular/core';
import {randomBytes} from 'crypto';
import * as bip39 from 'bip39';

class EntropyGeneratorConstants {
  static DEFAULT_ENTROPY_BYTES = 16;
  static ENTROPY_ALIGNMENT_BYTES = 4;
  static MIN_ENTROPY_BYTES = 16;
  static MAX_ENTROPY_BYTES = 64;
}

// Entropy we generate for the user during the signup process.
// Some fields are redundant so we can display them in the template.
export type TemporaryEntropy = {
  entropy: Buffer,
  isVerified: boolean,
  mnemonic: string,
  extraText: string,

  // Display fields.
  customEntropyHex: string,
  customEntropyHexMessage: string,

  customMnemonicMessage: string
};

@Injectable({
  providedIn: 'root'
})
export class EntropyService {
  // @ts-ignore
  temporaryEntropy: TemporaryEntropy;
  // This boolean defines whether or not the "advanced" entropy settings are open on sign up.
  advancedOpen = false;

  constructor() { this.setNewTemporaryEntropy(); }

  // This function sets a "TemporaryEntropy" object on the entropy service singleton.
  setNewTemporaryEntropy(): void {
    const entropy = randomBytes(EntropyGeneratorConstants.DEFAULT_ENTROPY_BYTES);
    const mnemonic = bip39.entropyToMnemonic(entropy);

    this.temporaryEntropy = {
      entropy,
      isVerified: false,
      mnemonic,
      extraText: '',

      customEntropyHex: entropy.toString('hex'),
      customEntropyHexMessage: '',

      customMnemonicMessage: ''
    };
  }

  isValidCustomEntropyHex(hexVal: string): boolean {
    if (hexVal.length === 0) {
      return false;
    } else if (!/^[0-9a-f]*$/.test(hexVal)) {
      return false;
    } else if (hexVal.length < (EntropyGeneratorConstants.MIN_ENTROPY_BYTES * 2)) {
      return false;
    } else if (hexVal.length > (EntropyGeneratorConstants.MAX_ENTROPY_BYTES * 2)) {
      return false;
    } else if (hexVal.length % (EntropyGeneratorConstants.ENTROPY_ALIGNMENT_BYTES * 2) !== 0) {
      return false;
    } else {
      return true;
    }
  }

  isValidMnemonic(mnemonic: string): boolean {
    try {
      bip39.mnemonicToEntropy(mnemonic);
    } catch {
      return false;
    }
    return true;
  }
}

import { Component, OnInit } from '@angular/core';
import {AccountService} from "../account.service";
import {IdentityService} from "../identity.service";
import {CryptoService} from "../crypto.service";
import {EntropyService} from "../entropy.service";
import {GlobalVarsService} from "../global-vars.service";
import {BackendAPIService} from "../backend-api.service";
import {Router} from "@angular/router";
import HDNode from "hdkey";
import {RouteNames} from "../app-routing.module";

@Component({
  selector: 'app-log-in-seed',
  templateUrl: './log-in-seed.component.html',
  styleUrls: ['./log-in-seed.component.scss']
})
export class LogInSeedComponent implements OnInit {
  loading = false;

  // Loading an account
  showLoadAccount = false;
  advancedOpen = false;
  loginError = '';
  mnemonic = '';
  extraText = '';

  // Logging in
  canLogin = false;
  showAccessLevels = true;
  selectedAccount = '';

  allUsers: { [key: string]: any } = {};

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private router: Router,
  ) {}

  ngOnInit(): void {
  }

  clickLoadAccount(): void {
    // Store mnemonic and extraText locally because we clear them below and otherwise
    // they don't get saved in local storage reliably
    const mnemonic = this.mnemonic;
    const extraText = this.extraText;

    if (!this.entropyService.isValidMnemonic(mnemonic)) {
      this.loginError = 'Invalid mnemonic';
      return;
    }

    const keychain = this.cryptoService.mnemonicToKeychain(mnemonic, extraText);
    const keychainNonStandard = this.cryptoService.mnemonicToKeychain(mnemonic, extraText, true);

    this.addKeychain(keychain, mnemonic, extraText);

    // NOTE: Temporary support for 1 in 128 legacy users who have non-standard derivations
    if (keychain.publicKey !== keychainNonStandard.publicKey) {
      const network = this.globalVars.network;
      const seedHex = this.cryptoService.keychainToSeedHex(keychainNonStandard);
      const privateKey = this.cryptoService.seedHexToPrivateKey(seedHex);
      const publicKey = this.cryptoService.privateKeyToBitcloutPublicKey(privateKey, network);

      // We only want to add nonStandard derivations if the account is worth importing
      this.backendApi.GetUsersStateless([publicKey]).subscribe(res => {
        const user = res.UserList[0];
        if (user.ProfileEntryResponse || user.BalanceNanos > 0 || user.UsersYouHODL?.length) {
          // Add the non-standard key if the user has a profile, a balance, or holdings
          this.addKeychain(keychainNonStandard, mnemonic, extraText);
        }
      });
    }

    // Clear the form
    this.mnemonic = '';
    this.extraText = '';

    this.router.navigate(['/', RouteNames.LOG_IN]);
  }

  addKeychain(keychain: HDNode, mnemonic: string, extraText: string): void {
    const network = this.globalVars.network;
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);

    this.accountService.addUser({
      seedHex,
      mnemonic,
      extraText,
      btcDepositAddress,
      network,
    });
  }
}

import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {CryptoService} from '../crypto.service';
import {EntropyService} from '../entropy.service';
import {GlobalVarsService} from '../global-vars.service';
import {BackendAPIService} from '../backend-api.service';
import {AccessLevel} from '../../types/identity';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss']
})
export class LogInComponent implements OnInit {
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

  allUsers: {[key: string]: any} = {};

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
  ) { }

  ngOnInit(): void {
    this.loadUsers();
    this.setCanLogin();
  }

  loadUsers(): void {
    const publicKeys = this.accountService.getPublicKeys();
    for (const publicKey of publicKeys) {
      this.allUsers[publicKey] = {};
    }

    if (publicKeys.length === 0) {
      this.showLoadAccount = true;
    } else {
      this.showLoadAccount = false;
      this.selectAccount(publicKeys[0]);
      this.backendApi.GetUsersStateless(publicKeys).subscribe(res2 => {
        for (const user of res2.UserList) {
          this.allUsers[user.PublicKeyBase58Check] = {
            username: user.ProfileEntryResponse?.Username,
            profilePic: user.ProfileEntryResponse?.ProfilePic,
          };
        }
      });
    }
  }

  selectAccount(publicKey: string): void {
    this.selectedAccount = publicKey;
    this.setCanLogin();
  }

  setCanLogin(): void {
    if (this.globalVars.isFullAccessHostname()) {
      this.showAccessLevels = false;
    }

    const validAccessLevel = Object.values(AccessLevel).includes(this.globalVars.accessLevelRequest);
    this.canLogin = !!(this.globalVars.hostname && validAccessLevel && this.selectedAccount);
  }

  clickLoadAccount(): void {
    if (!this.entropyService.isValidMnemonic(this.mnemonic)) {
      this.loginError = 'Invalid mnemonic';
      return;
    }

    const network = this.globalVars.network;
    const keychain = this.cryptoService.mnemonicToKeychain(this.mnemonic, this.extraText);
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);

    this.accountService.addUser({
      seedHex,
      mnemonic: this.mnemonic,
      extraText: this.extraText,
      btcDepositAddress,
      network,
    });

    this.loadUsers();
  }

  clickLogin(): void {
    if (!this.canLogin) {
      return;
    }

    if (!this.globalVars.isFullAccessHostname()) {
      this.accountService.setAccessLevel(this.selectedAccount, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    }

    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.selectedAccount,
    });
  }
}

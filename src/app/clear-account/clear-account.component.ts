import { Component } from '@angular/core';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService } from '../backend-api.service';
import { CryptoService } from '../crypto.service';
import { EntropyService } from '../entropy.service';
import { GoogleDriveService } from '../google-drive.service';

@Component({
  selector: 'app-clear-account',
  templateUrl: './clear-account.component.html',
  styleUrls: ['./clear-account.component.scss'],
})
export class ClearAccountComponent {
  allUsers: { [key: string]: any } = {};
  clearAccountCheck = '';
  hasUsers = false;
  loading = false;
  showAccessLevels = true;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService
  ) {}

  clearAccounts(): void {
    const publicKeys = this.accountService.getPublicKeys();
    for (const key of publicKeys) {
      this.accountService.deleteUser(key);
    }
    window.location.reload();
  }

  clearAccountsCancel(): void {
    this.clearAccountCheck = '';
  }
}

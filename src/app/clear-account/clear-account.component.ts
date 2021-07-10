import { Component } from '@angular/core';
import { AccountService } from '../account.service';
import { GlobalVarsService } from '../global-vars.service';

@Component({
  selector: 'app-clear-account',
  templateUrl: './clear-account.component.html',
  styleUrls: ['./clear-account.component.scss'],
})
export class ClearAccountComponent {
  clearAccountCheck = '';

  constructor(
    private accountService: AccountService,
    public globalVars: GlobalVarsService
  ) {}

  clearAccounts(): void {
    const publicKeys = this.accountService.getPublicKeys();
    for (const key of publicKeys) {
      this.accountService.deleteUser(key);
    }
  }

  clearAccountsCancel(): void {
    this.clearAccountCheck = '';
  }
}

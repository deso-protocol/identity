import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { LoginMethod, UserProfile } from 'src/types/identity';
import { SwalHelper } from '../../lib/helpers/swal-helper';
import { AccountService } from '../account.service';
import { BackendAPIService } from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';

@Component({
  selector: 'app-account-select',
  templateUrl: './account-select.component.html',
  styleUrls: ['./account-select.component.scss'],
})
export class AccountSelectComponent implements OnInit {
  // Let people either pass in the users or default to calling it the standard way
  @Output() onAccountSelect: EventEmitter<string> = new EventEmitter();
  @Input() allUsers: Observable<{ [key: string]: UserProfile }> =
    this.backendApi.GetUserProfiles(this.accountService.getPublicKeys());
  @Input() componentTitle = 'Select an account';
  @Input() hideLoginMethod = false;

  visibleUsers: Array<UserProfile & { key: string }> = [];

  constructor(
    public accountService: AccountService,
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {
    let visibleUsers: typeof this.visibleUsers = [];

    this.allUsers.pipe(take(1)).subscribe((users) => {
      for (const key of Object.keys(users)) {
        if (!this.accountService.isUserHidden(key)) {
          visibleUsers.push({
            key,
            ...users[key],
          });
        }
      }

      this.visibleUsers = visibleUsers.sort((a, b) => {
        return this.accountService.getLastLoginTimestamp(b.key) - this.accountService.getLastLoginTimestamp(a.key);
      });
    });
  }

  public getLoginIcon(loginMethod: LoginMethod) {
    return {
      [LoginMethod.DESO]: 'assets/logo-deso-mark.svg',
      [LoginMethod.GOOGLE]: 'assets/google_logo.svg',
      [LoginMethod.METAMASK]: 'assets/metamask.png',
    }[loginMethod];
  }

  selectAccount(publicKey: string) {
    this.accountService.setLastLoginTimestamp(publicKey);
    this.onAccountSelect.emit(publicKey);
  }

  /**
   * NOTE: This performs a soft delete. The user's data is still stored in
   * localStorage and can be recovered.
   */
  removeAccount(publicKey: string) {
    SwalHelper.fire({
      title: 'Remove Account?',
      text: 'Do you really want to remove this account? Your account will be irrecoverable if you lose your seed phrase or login credentials.',
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        this.accountService.hideUser(publicKey);
        this.visibleUsers = this.visibleUsers.filter(
          (user) => user.key !== publicKey
        );
      }
    });
  }
}

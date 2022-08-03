import { Component, OnInit } from '@angular/core';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService } from '../backend-api.service';
import { LoginMethod, UserProfile } from '../../types/identity';
import { GoogleDriveService } from '../google-drive.service';
import { RouteNames } from '../app-routing.module';
import { Router } from '@angular/router';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss'],
})
export class LogInComponent implements OnInit {
  loading = false;
  showAccessLevels = true;
  finishedSignup = false;

  allUsers: { [key: string]: UserProfile } = {};
  hasUsers = false;

  constructor(
    public accountService: AccountService,
    private identityService: IdentityService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys).subscribe((profiles) => {
      this.allUsers = profiles;
    });

    // Set showAccessLevels
    this.showAccessLevels = !this.globalVars.isFullAccessHostname();
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccount(publicKey: string): void {
    this.accountService.setAccessLevel(
      publicKey,
      this.globalVars.hostname,
      this.globalVars.accessLevelRequest
    );
    if (!this.globalVars.getFreeDeso) {
      this.login(publicKey);
    } else {
      this.backendApi
        .GetUsersStateless([publicKey], true, true, true)
        .subscribe(
          (res) => {
            if (!res?.UserList.length || res.UserList[0].BalanceNanos === 0) {
              this.navigateToGetDeso(publicKey);
            } else {
              this.login(publicKey);
            }
          },
          (err) => {
            console.error(err);
            this.navigateToGetDeso(publicKey);
          }
        );
    }
  }

  navigateToGetDeso(publicKey: string): void {
    this.router.navigate(['/', RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
      queryParams: { publicKey },
    });
  }

  navigateToMetamaskSignup(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP_METAMASK], {
      queryParamsHandling: 'merge',
    });
  }

  login(publicKey: string): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: publicKey,
      signedUp: false,
    });
  }

  public getLoginIcon(loginMethod: LoginMethod): any {
    return {
      [LoginMethod.DESO]: 'assets/deso-logo.png',
      [LoginMethod.GOOGLE]: 'assets/google_logo.svg',
      [LoginMethod.METAMASK]: 'assets/metamask.png',
    }[loginMethod];
  }
}

export const getSpendingLimitsForMetamask = (): any => {
  return {
    IsUnlimited: true,
  };
};

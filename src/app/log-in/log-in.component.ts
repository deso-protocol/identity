import { Component, OnInit } from '@angular/core';
import { AccountService, AccountType } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService } from '../backend-api.service';
import { UserProfile } from '../../types/identity';
import { CryptoService } from '../crypto.service';
import { EntropyService } from '../entropy.service';
import { GoogleDriveService } from '../google-drive.service';
import { RouteNames } from '../app-routing.module';
import { Router } from '@angular/router';
import { SigningService } from '../signing.service';

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
    private accountService: AccountService,
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
      console.log(profiles);
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

  public truncatePublicKey(key: string): any {
    if (key.length <= 12) {
      return key;
    }
    return `${key.substring(0, 7)}....${key.substring(
      key.length - 4,
      key.length
    )}`;
  }

  public getLoginIcon(type: AccountType): any {
    return {
      0: 'assets/deso-logo.png',
      1: 'assets/google_logo.svg',
      2: 'assets/metamask.png',
    }[type];
  }
}

export const getSpendingLimitsForMetamask = (): any => {
  return {
    GlobalDESOLimit: 1000000000,
    TransactionCountLimitMap: {
      SUBMIT_POST: 120000,
      UPDATE_PROFILE: 120000,
      AUTHORIZE_DERIVED_KEY: 120000,
    },
  };
};

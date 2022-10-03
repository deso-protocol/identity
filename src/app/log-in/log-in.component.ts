import { Component, OnInit } from '@angular/core';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService } from '../backend-api.service';
import { RouteNames } from '../app-routing.module';
import { Router } from '@angular/router';
import { LoginMethod, Network } from '../../types/identity';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss'],
})
export class LogInComponent implements OnInit {
  showAccessLevels = true;

  constructor(
    public accountService: AccountService,
    private identityService: IdentityService,
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set showAccessLevels
    this.showAccessLevels = !this.globalVars.isFullAccessHostname();
  }

  login(publicKey: string): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: publicKey,
      signedUp: false,
    });
  }

  navigateToGetDeso(publicKey: string): void {
    this.router.navigate(['/', RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
      queryParams: { publicKey },
    });
  }

  onAccountSelect(publicKey: string): void {
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
}

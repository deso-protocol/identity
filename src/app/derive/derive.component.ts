import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {BackendAPIService} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';
import {GoogleDriveService} from '../google-drive.service';
import {UserProfile} from '../../types/identity';
import {Router} from '@angular/router';
import {RouteNames} from '../app-routing.module';

@Component({
  selector: 'app-derive',
  templateUrl: './derive.component.html',
  styleUrls: ['./derive.component.scss']
})
export class DeriveComponent implements OnInit {

  allUsers: {[key: string]: UserProfile} = {};
  hasUsers = false;
  withCallback = false;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private googleDrive: GoogleDriveService,
    private backendApi: BackendAPIService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    // Set withCallback
    this.withCallback = this.globalVars.callback !== null;
  }

  redirectLoadSeed(): void {
    this.router.navigate(['/', RouteNames.LOAD_SEED], { queryParams: { origin: RouteNames.DERIVE }, queryParamsHandling: 'merge' });
  }

  redirectSignUp(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP], { queryParams: { origin: RouteNames.DERIVE }, queryParamsHandling: 'merge' });
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle(RouteNames.DERIVE);
  }

  selectAccountAndDeriveKey(publicKey: string): void {
    this.identityService.derive({
      publicKey
    });
  }
}

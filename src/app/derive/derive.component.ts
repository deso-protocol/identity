import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {BackendAPIService} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';
import {GoogleDriveService} from '../google-drive.service';
import {UserProfile} from '../../types/identity';
import {ActivatedRoute, Router} from '@angular/router';
import {RouteNames} from '../app-routing.module';

@Component({
  selector: 'app-derive',
  templateUrl: './derive.component.html',
  styleUrls: ['./derive.component.scss']
})
export class DeriveComponent implements OnInit {

  allUsers: {[key: string]: UserProfile} = {};
  hasUsers = false;
  derivedPublicKeyBase58Check: string | undefined = undefined;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private googleDrive: GoogleDriveService,
    private backendApi: BackendAPIService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    // Set derive to true
    this.globalVars.derive = true;

    this.route.queryParams.subscribe((params) => {
      if (params.derivedPublicKeyBase58Check) {
        this.derivedPublicKeyBase58Check = params.derivedPublicKeyBase58Check;
        this.globalVars.derivedPublicKeyBase58Check = this.derivedPublicKeyBase58Check;
      }
    });
  }

  redirectLoadSeed(): void {
    this.router.navigate(['/', RouteNames.LOAD_SEED]);
  }

  redirectSignUp(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP]);
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccountAndDeriveKey(publicKey: string): void {
    this.identityService.derive({
      publicKey,
      derivedPublicKeyBase58Check: this.derivedPublicKeyBase58Check,
    });
  }
}

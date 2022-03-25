import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {DerivePayload, IdentityService} from '../identity.service';
import {BackendAPIService, User} from '../backend-api.service';
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
  derivePayload: DerivePayload | null = null;
  userMap: { [k: string]: User } = {};

  publicKeyBase58Check: string | undefined = undefined;
  derivedPublicKeyBase58Check: string | undefined = undefined;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private googleDrive: GoogleDriveService,
    private backendApi: BackendAPIService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    this.activatedRoute.queryParams.subscribe(params => {
      if (params.publicKey) {
        this.publicKeyBase58Check = params.publicKey;
      }
      if (params.derivedPublicKey) {
        this.derivedPublicKeyBase58Check = params.derivedPublicKey;
      }
    });
    // Set derive to true
    this.globalVars.derive = true;
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
    });
  }

  approveDerivedKey(): void {
    if (!this.publicKeyBase58Check) {
      return;
    }
    this.identityService.derive({
      publicKey: this.publicKeyBase58Check,
      derivedPublicKey: this.derivedPublicKeyBase58Check,
    });
  }
}

import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {BackendAPIService} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';
import {GoogleDriveService} from '../google-drive.service';
import {UserProfile} from '../../types/identity';

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

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccountAndDeriveKey(publicKey: string): void {
    this.backendApi.GetAppState().subscribe( res => {
      const blockHeight = res.BlockHeight;
      this.identityService.derive({
        derivedPrivateUserInfo: this.accountService.getDerivedPrivateUser(publicKey, blockHeight),
      });
    });
  }
}

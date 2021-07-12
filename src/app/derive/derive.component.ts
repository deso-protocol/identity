import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {BackendAPIService} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';
import {RouteNames} from '../app-routing.module';
import {Network} from '../../types/identity';
import {GoogleDriveService} from '../google-drive.service';

@Component({
  selector: 'app-derive',
  templateUrl: './derive.component.html',
  styleUrls: ['./derive.component.scss']
})
export class DeriveComponent implements OnInit {

  allUsers: {[key: string]: any} = {};
  hasUsers = false;
  showAccessLevels = true;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    this.loadUsers();
  }

  loadUsers(): void {
    const publicKeys = this.accountService.getPublicKeys();
    for (const publicKey of publicKeys) {
      this.allUsers[publicKey] = {};
    }
    this.hasUsers = publicKeys.length > 0;

    if (publicKeys.length > 0) {
      this.backendApi.GetUsersStateless(publicKeys).subscribe(res2 => {
        for (const user of res2.UserList) {
          this.allUsers[user.PublicKeyBase58Check] = {
            username: user.ProfileEntryResponse?.Username,
            profilePic: user.ProfileEntryResponse?.ProfilePic,
          };
        }
      });
    }
  }

  launchGoogle(): void {
    const redirectUri = new URL(`${window.location.origin}/${RouteNames.AUTH_GOOGLE}`);
    if (this.globalVars.network === Network.testnet) {
      redirectUri.searchParams.append('testnet', 'true');
    }

    const oauthUri = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    oauthUri.searchParams.append('redirect_uri', redirectUri.toString());
    oauthUri.searchParams.append('client_id', GoogleDriveService.CLIENT_ID);
    oauthUri.searchParams.append('scope', GoogleDriveService.DRIVE_SCOPE);
    oauthUri.searchParams.append('response_type', 'token');
    // TODO: Investigate using this parameter to defend against CSRF attacks
    // pass on webview state to Google OAuth state
    // https://stackoverflow.com/questions/7722062/google-oauth-2-0-redirect-uri-with-several-parameters
    const stateString = btoa(JSON.stringify({
      webview: this.globalVars.webview,
      testnet: this.globalVars.network === Network.testnet
    }));
    oauthUri.searchParams.append('state', stateString);

    window.location.href = oauthUri.toString();
  }

  selectAccount(publicKey: string): void {
    this.backendApi.GetBlockTipHeight().subscribe( res => {
      const blockHeight = res.Header.Height;
      this.identityService.derive({
        derivedUserInfo: this.accountService.getDerivedUser(publicKey, blockHeight),
      });
    });
  }
}

import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {BackendAPIService} from '../backend-api.service';
import {Network} from '../../types/identity';
import {CryptoService} from '../crypto.service';
import {EntropyService} from '../entropy.service';
import {GoogleDriveService} from '../google-drive.service';
import {RouteNames} from '../app-routing.module';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss']
})
export class LogInComponent implements OnInit {
  loading = false;
  showAccessLevels = true;

  allUsers: {[key: string]: any} = {};
  hasUsers = false;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    this.loadUsers();

    // Set showAccessLevels
    this.showAccessLevels = !this.globalVars.isFullAccessHostname();
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
    this.accountService.setAccessLevel(publicKey, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: publicKey,
    });
  }
}

import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {CryptoService} from '../crypto.service';
import {EntropyService} from '../entropy.service';
import {GlobalVarsService} from '../global-vars.service';
import {BackendAPIService} from '../backend-api.service';
import {GoogleAuthService} from '../google-auth.service';
import {GoogleDriveService} from '../google-drive.service';
import {ActivatedRoute} from '@angular/router';
import {Network} from "../../types/identity";

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss']
})
export class LogInComponent implements OnInit {
  loading = false;

  allUsers: {[key: string]: any} = {};

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private googleAuth: GoogleAuthService,
  ) { }

  ngOnInit(): void {
    // Load the auth API immediately so it's ready when we click the button
    this.googleAuth.getAuth().subscribe();

    // Load profile pictures and usernames
    this.loadUsers();
  }

  loadUsers(): void {
    const publicKeys = this.accountService.getPublicKeys();
    for (const publicKey of publicKeys) {
      this.allUsers[publicKey] = {};
    }

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
    const redirectUri = new URL(`${window.location.origin}/auth/google`);
    if (this.globalVars.network === Network.testnet) {
      redirectUri.searchParams.append('testnet', 'true');
    }

    this.googleAuth.getAuth().subscribe(res => {
      res.signIn({
        fetch_basic_profile: true,
        ux_mode: 'redirect',
        redirect_uri: redirectUri.toString()
      });
    });
  }

  selectAccount(publicKey: string): void {
    this.accountService.setAccessLevel(publicKey, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: publicKey,
    });
  }
}

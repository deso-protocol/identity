import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {BackendAPIService} from '../backend-api.service';
import {Network, UserProfile} from '../../types/identity';
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

  allUsers: {[key: string]: UserProfile} = {};
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
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    // Set showAccessLevels
    this.showAccessLevels = !this.globalVars.isFullAccessHostname();
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccount(publicKey: string): void {
    this.accountService.setAccessLevel(publicKey, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: publicKey,
      signedUp: false
    });
  }
}

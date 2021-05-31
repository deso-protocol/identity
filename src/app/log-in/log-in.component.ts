import {Component, NgZone, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {BackendAPIService} from '../backend-api.service';
import {GoogleAuthService} from '../google-auth.service';
import {Network} from '../../types/identity';
import {RouteNames} from '../app-routing.module';
import {Subject} from 'rxjs';
import {CryptoService} from '../crypto.service';
import {EntropyService} from '../entropy.service';
import {GoogleDriveService} from '../google-drive.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss']
})
export class LogInComponent implements OnInit {
  loading = false;
  showAccessLevels = true;

  allUsers: {[key: string]: any} = {};

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private googleAuth: GoogleAuthService,
    private router: Router,
    private zone: NgZone,
  ) { }

  ngOnInit(): void {
    // Load the auth API immediately so it's ready when we click the button
    this.googleAuth.getAuth().subscribe();

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
        redirect_uri: redirectUri.toString()
      }).then((googleUser) => {
        const authResponse = googleUser.getAuthResponse();
        if (authResponse.scope?.includes(GoogleAuthService.DRIVE_SCOPE)) {
          this.createOrLoadAccount();
        }
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

  // Begin Google

  createOrLoadAccount(): void {
    this.googleDrive.listFiles(this.fileName()).subscribe(res => {
      if (res.files.length > 0) {
        this.loadAccount(res.files);
      } else {
        this.createAccount();
      }
    });
  }

  loadAccount(files: any): void {
    const filesLoaded = new Subject();
    let lastPublicKeyLoaded = '';
    let numLoaded = 0;

    for (const file of files) {
      this.googleDrive.getFile(file.id).subscribe(fileContents => {
        try {
          lastPublicKeyLoaded = this.accountService.addUser(fileContents);
        } catch (err) {
          console.error(err);
        }

        numLoaded += 1;
        if (numLoaded === files.length) {
          filesLoaded.next(true);
          filesLoaded.complete();
        }
      });
    }

    filesLoaded.subscribe(() => {
      if (numLoaded === 1) {
        this.finishFlow(lastPublicKeyLoaded, false);
      } else {
        this.zone.run(() => {
          this.router.navigate(['/', RouteNames.LOG_IN]);
        });
      }
    });
  }

  createAccount(): void {
    this.googleAuth.getAuth().subscribe((googleAuth) => {
      const mnemonic = this.entropyService.temporaryEntropy.mnemonic;
      const extraText = '';
      const network = this.globalVars.network;
      const keychain = this.cryptoService.mnemonicToKeychain(mnemonic, extraText);
      const seedHex = this.cryptoService.keychainToSeedHex(keychain);
      const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);

      const googleProfile = googleAuth.currentUser.get().getBasicProfile();
      const googleUser = {
        id: googleProfile.getId(),
        email: googleProfile.getEmail(),
        name: googleProfile.getName(),
        imageUrl: googleProfile.getImageUrl(),
      };

      const userInfo = {
        seedHex,
        mnemonic,
        extraText,
        btcDepositAddress,
        network,
        googleUser,
      };

      this.googleDrive.uploadFile(this.fileName(), JSON.stringify(userInfo)).subscribe(() => {
        const publicKey = this.accountService.addUser(userInfo);
        this.finishFlow(publicKey, true);
      });
    });
  }

  finishFlow(publicKeyAdded: string, signedUp: boolean): void {
    this.accountService.setAccessLevel(publicKeyAdded, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded,
      signedUp,
    });
  }

  fileName(): string {
    return `${this.globalVars.network}.json`;
  }
}

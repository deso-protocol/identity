import {Component, NgZone, OnInit} from '@angular/core';
import {GoogleAuthService} from '../../google-auth.service';
import {GoogleDriveService} from '../../google-drive.service';
import {ActivatedRoute, Router} from '@angular/router';
import {AccountService} from '../../account.service';
import {IdentityService} from '../../identity.service';
import {CryptoService} from '../../crypto.service';
import {EntropyService} from '../../entropy.service';
import {GlobalVarsService} from '../../global-vars.service';
import {Subject} from 'rxjs';
import {RouteNames} from '../../app-routing.module';
import GoogleDriveFiles = gapi.client.drive.FilesResource;

@Component({
  selector: 'app-google',
  templateUrl: './google.component.html',
  styleUrls: ['./google.component.scss']
})
export class GoogleComponent implements OnInit {

  counter = 0;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    public globalVars: GlobalVarsService,
    private googleAuth: GoogleAuthService,
    private googleDrive: GoogleDriveService,
    private route: ActivatedRoute,
    private router: Router,
    private zone: NgZone,
  ) { }

  ngOnInit(): void {
    this.route.fragment.subscribe((params) => {
      const hashParams = new URLSearchParams(params);

      this.zone.run(() => {
        if (hashParams.get('scope')?.includes(GoogleAuthService.DRIVE_SCOPE)) {
          setTimeout(() => {
            this.createOrLoadAccount();
          }, 1000);
        } else {
          this.router.navigate(['/', RouteNames.LOG_IN]);
        }
      });
    });
  }

  createOrLoadAccount(): void {
    this.googleDrive.getFiles().subscribe(googleDriveFiles => {
      setTimeout(() => {
        googleDriveFiles.list({
          spaces: 'appDataFolder',
          fields: 'files(id, name)',
          pageSize: 100,
          q: `name = '${this.fileName()}'`
        }).then((res: any) => {
          const files = res.result.files;
          if (files.length > 0) {
            this.loadAccount(googleDriveFiles, files);
          } else {
            this.createAccount();
          }
        });
      }, 1000);
    });
  }

  loadAccount(googleDriveFiles: GoogleDriveFiles, files: any): void {
    const filesLoaded = new Subject();
    let lastPublicKeyLoaded = '';
    let numLoaded = 0;

    for (const file of files) {
      googleDriveFiles.get({fileId: file.id, alt: 'media'}).then((fileContents) => {
        const userInfo = JSON.parse(fileContents.body);
        try {
          lastPublicKeyLoaded = this.accountService.addUser(userInfo);
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

  fileName(): string {
    return `${this.globalVars.network}.json`;
  }

  finishFlow(publicKeyAdded: string, signedUp: boolean): void {
    this.accountService.setAccessLevel(publicKeyAdded, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded,
      signedUp,
    });
  }
}

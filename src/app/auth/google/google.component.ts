import {Component, NgZone, OnInit} from '@angular/core';
import {Subject} from 'rxjs';
import {RouteNames} from '../../app-routing.module';
import {AccountService} from '../../account.service';
import {IdentityService} from '../../identity.service';
import {CryptoService} from '../../crypto.service';
import {EntropyService} from '../../entropy.service';
import {GoogleDriveService} from '../../google-drive.service';
import {GlobalVarsService} from '../../global-vars.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-google',
  templateUrl: './google.component.html',
  styleUrls: ['./google.component.scss']
})
export class GoogleComponent implements OnInit {

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private router: Router,
    private zone: NgZone,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.route.fragment.subscribe((params) => {
      const hashParams = new URLSearchParams(params);
      const accessToken = hashParams.get('access_token');
      if (!accessToken) {
        return;
      }

      this.googleDrive.setAccessToken(accessToken);

      this.googleDrive.listFiles(this.fileName()).subscribe(res => {
        if (res.files.length > 0) {
          this.loadAccounts(res.files);
        } else {
          this.createAccount();
        }
      });
    });
  }

  loadAccounts(files: any): void {
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
    const mnemonic = this.entropyService.temporaryEntropy.mnemonic;
    const extraText = '';
    const network = this.globalVars.network;
    const keychain = this.cryptoService.mnemonicToKeychain(mnemonic, extraText);
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);

    const userInfo = {
      seedHex,
      mnemonic,
      extraText,
      btcDepositAddress,
      network,
      google: true,
    };

    this.googleDrive.uploadFile(this.fileName(), JSON.stringify(userInfo)).subscribe(() => {
      const publicKey = this.accountService.addUser(userInfo);
      this.finishFlow(publicKey, true);
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

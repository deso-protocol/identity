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
import {TextService} from '../../text.service';
import {GoogleAuthState} from '../../../types/identity';
import {environment} from '../../../environments/environment';


@Component({
  selector: 'app-google',
  templateUrl: './google.component.html',
  styleUrls: ['./google.component.scss']
})
export class GoogleComponent implements OnInit {

  loading = true;
  seedCopied = false;
  publicKey = '';
  mnemonic = '';
  showGetFreeCLOUT = false;
  environment = environment;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private textService: TextService,
    private router: Router,
    private zone: NgZone,
    private route: ActivatedRoute,
  ) { }

  copySeed(): void {
    this.textService.copyText(this.mnemonic);
    this.seedCopied = true;
  }

  downloadSeed(): void {
    this.textService.downloadText(this.mnemonic, 'bitclout-seed.txt');
  }

  printSeed(): void {
    window.print();
  }

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
    let numLoaded = 0;

    for (const file of files) {
      this.googleDrive.getFile(file.id).subscribe(fileContents => {
        try {
          this.publicKey = this.accountService.addUser(fileContents);
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
        this.finishFlow(false);
      } else {
        this.zone.run(() => {
          this.router.navigate(['/', RouteNames.LOG_IN]);
        });
      }
    });
  }

  createAccount(): void {
    // store the new mnemonic in our component to be extra safe
    this.mnemonic = this.entropyService.temporaryEntropy.mnemonic;

    const mnemonic = this.mnemonic;
    const extraText = '';
    const network = this.globalVars.network;
    const keychain = this.cryptoService.mnemonicToKeychain(this.mnemonic, extraText);
    const seedHex = this.cryptoService.keychainToSeedHex(keychain);
    const btcDepositAddress = this.cryptoService.keychainToBtcAddress(keychain, network);

    const userInfo = {
      mnemonic,
      extraText,
      seedHex,
      btcDepositAddress,
      network,
      google: true,
    };

    this.googleDrive.uploadFile(this.fileName(), JSON.stringify(userInfo)).subscribe(() => {
      this.publicKey = this.accountService.addUser(userInfo);
      this.loading = false;
    });
  }

  startJumio(): void {
    this.accountService.setAccessLevel(this.publicKey, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.showGetFreeCLOUT = true;
  }

  finishFlow(signedUp: boolean): void {
    this.accountService.setAccessLevel(this.publicKey, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKey,
      signedUp,
    });
  }

  fileName(): string {
    return `${this.globalVars.network}.json`;
  }
}

export const getStateParamsFromGoogle = (hashParams?: URLSearchParams): GoogleAuthState => {
  const defaultStateParams = { webview: false, testnet: false };
  try {
    const stateParamsString = hashParams?.get('state');
    const stateParams: GoogleAuthState = stateParamsString ? JSON.parse(atob(stateParamsString)) : null;
    if (stateParams) {
      return stateParams;
    }
  } catch (e) {
    console.error('Failed to parse state passed from Google');
  }
  return defaultStateParams;
};

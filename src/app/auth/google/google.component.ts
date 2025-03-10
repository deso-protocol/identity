import { Component, NgZone, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GoogleAuthState, LoginMethod } from '../../../types/identity';
import { AccountService } from '../../account.service';
import { RouteNames } from '../../app-routing.module';
import { BackendAPIService } from '../../backend-api.service';
import { CryptoService } from '../../crypto.service';
import { EntropyService } from '../../entropy.service';
import { GlobalVarsService } from '../../global-vars.service';
import { GoogleDriveService } from '../../google-drive.service';
import { IdentityService } from '../../identity.service';
import { TextService } from '../../text.service';

@Component({
  selector: 'app-google',
  templateUrl: './google.component.html',
  styleUrls: ['./google.component.scss'],
})
export class GoogleComponent implements OnInit {
  loading = true;
  seedCopied = false;
  publicKey = '';
  mnemonic = '';
  showGetFreeDESO = false;
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
    private backendApi: BackendAPIService
  ) {}

  copySeed(): void {
    this.textService.copyText(this.mnemonic);
    this.seedCopied = true;
  }

  downloadSeed(): void {
    this.textService.downloadText(this.mnemonic, 'deso-seed.txt');
  }

  printSeed(): void {
    window.print();
  }

  ngOnInit(): void {
    this.route.fragment.subscribe((params) => {
      const hashParams = new URLSearchParams(params as string);
      const accessToken = hashParams.get('access_token');
      if (!accessToken) {
        return;
      }

      this.googleDrive.setAccessToken(accessToken);

      this.googleDrive.listFiles(this.fileName()).subscribe((res) => {
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
      this.googleDrive.getFile(file.id).subscribe((fileContents) => {
        try {
          const mnemonic = fileContents.mnemonic;
          const extraText = fileContents.extraText;
          const network = fileContents.network;
          const keychain = this.cryptoService.mnemonicToKeychain(mnemonic, {
            extraText,
          });

          this.publicKey = this.accountService.addUser(
            keychain,
            mnemonic,
            extraText,
            network,
            {
              loginMethod: LoginMethod.GOOGLE,
            }
          );
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
          this.router.navigate(['/', RouteNames.LOG_IN], {
            queryParamsHandling: 'merge',
          });
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

    const userInfo = {
      mnemonic,
      extraText,
      network,
    };

    this.googleDrive
      .uploadFile(this.fileName(), JSON.stringify(userInfo))
      .subscribe(() => {
        const keychain = this.cryptoService.mnemonicToKeychain(mnemonic, {
          extraText,
        });
        this.publicKey = this.accountService.addUser(
          keychain,
          mnemonic,
          extraText,
          network,
          {
            loginMethod: LoginMethod.GOOGLE,
          }
        );
        this.loading = false;
      });
  }

  finishFlow(signedUp: boolean): void {
    this.globalVars.signedUp = signedUp;
    this.accountService.setAccessLevel(
      this.publicKey,
      this.globalVars.hostname,
      this.globalVars.accessLevelRequest
    );

    if (!this.globalVars.getFreeDeso) {
      this.login(signedUp);
      return;
    }
    if (!signedUp || !this.globalVars.getFreeDeso) {
      this.backendApi
        .GetUsersStateless([this.publicKey], true, true)
        .subscribe((res) => {
          if (res?.UserList?.length) {
            if (res.UserList[0].BalanceNanos !== 0) {
              this.login(signedUp);
              return;
            }
          }
          this.router.navigate(['/', RouteNames.GET_DESO], {
            queryParams: { publicKey: this.publicKey, signedUp },
            queryParamsHandling: 'merge',
          });
        });
    } else {
      this.router.navigate(['/', RouteNames.GET_DESO], {
        queryParams: { publicKey: this.publicKey, signedUp },
        queryParamsHandling: 'merge',
      });
    }
  }

  login(signedUp: boolean): void {
    if (this.globalVars.derive) {
      this.router.navigate(['/', RouteNames.DERIVE], {
        queryParams: {
          publicKey: this.publicKey,
          transactionSpendingLimitResponse:
            this.globalVars.transactionSpendingLimitResponse,
          deleteKey: this.globalVars.deleteKey || undefined,
          derivedPublicKey: this.globalVars.derivedPublicKey || undefined,
          expirationDays: this.globalVars.expirationDays || undefined,
        },
        queryParamsHandling: 'merge',
      });
      return;
    }
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

export const getStateParamsFromGoogle = (
  hashParams?: URLSearchParams
): GoogleAuthState => {
  const defaultStateParams: GoogleAuthState = {
    webview: false,
    testnet: false,
    jumio: false,
    callback: '',
    derive: false,
    getFreeDeso: false,
    signedUp: false,
    transactionSpendingLimitResponse: '',
    deleteKey: false,
    derivedPublicKey: '',
    expirationDays: 0,
    redirect_uri: '',
    showSkip: false,
  };

  try {
    const stateParamsString = hashParams?.get('state');
    const stateParams: GoogleAuthState = stateParamsString
      ? JSON.parse(atob(stateParamsString))
      : null;
    if (stateParams) {
      return stateParams;
    }
  } catch (e) {
    console.error('Failed to parse state passed from Google');
  }

  return defaultStateParams;
};

import { Component, OnInit } from '@angular/core';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import {
  BackendAPIService,
  TransactionSpendingLimitResponse,
} from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { GoogleDriveService } from '../google-drive.service';
import { UserProfile } from '../../types/identity';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteNames } from '../app-routing.module';
import { truncatePublicKey } from '../utils';
import { map, switchMap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

@Component({
  selector: 'app-derive',
  templateUrl: './derive.component.html',
  styleUrls: ['./derive.component.scss'],
})
export class DeriveComponent implements OnInit {
  allUsers: { [key: string]: UserProfile } = {};
  transactionSpendingLimitResponse:
    | TransactionSpendingLimitResponse
    | undefined;
  hasUsers = false;
  hoveredAccount = -1;
  publicKeyBase58Check: string | undefined = undefined;
  derivedPublicKeyBase58Check: string | undefined = undefined;
  expirationDays = 30;
  deleteKey = false;
  isSingleAccount = false;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private googleDrive: GoogleDriveService,
    private backendApi: BackendAPIService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;

    this.activatedRoute.queryParams
      .pipe(
        switchMap((params) => {
          if (params.publicKey) {
            this.publicKeyBase58Check = params.publicKey;
            this.isSingleAccount = true;
          }
          if (params.derivedPublicKey) {
            this.derivedPublicKeyBase58Check = params.derivedPublicKey;
          }
          // We can only revoke if we have both the public key and derived public key from query params.
          if (
            params.deleteKey &&
            this.publicKeyBase58Check &&
            this.derivedPublicKeyBase58Check
          ) {
            this.deleteKey = params.deleteKey === 'true';
            // We don't want or need to parse transaction spending limit when revoking derived key,
            // so we initialize a spending limit object with no permissions.
            this.transactionSpendingLimitResponse = { GlobalDESOLimit: 0 };
            // Setting expiration days to 0 forces us to have a minimum transaction size that is still valid.
            this.expirationDays = 0;
            return of(null);
          }
          if (params.transactionSpendingLimitResponse) {
            this.transactionSpendingLimitResponse = JSON.parse(
              decodeURIComponent(params.transactionSpendingLimitResponse)
            );
          }
          if (params.expirationDays) {
            const numDays = parseInt(params.expirationDays, 10);
            if (numDays > 0) {
              this.expirationDays = numDays;
            }
          }
          return this.backendApi.GetUserProfiles(publicKeys);
        })
      )
      .subscribe((profiles) => {
        if (profiles) {
          // if there's an account in the query params display only that
          if (this.publicKeyBase58Check) {
            this.allUsers = {
              [this.publicKeyBase58Check]: profiles[this.publicKeyBase58Check],
            };
          } else {
            // otherwise display all accounts
            this.allUsers = profiles;
          }
        }
      });

    // this.backendApi.GetUserProfiles(publicKeys).subscribe((profiles) => {
    // });
    // Set derive to true
    this.globalVars.derive = true;
  }

  redirectLoadSeed(): void {
    this.router.navigate(['/', RouteNames.LOAD_SEED], {
      queryParamsHandling: 'merge',
    });
  }

  redirectSignUp(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP], {
      queryParamsHandling: 'merge',
    });
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccount(key: string): void {
    this.publicKeyBase58Check = key;
  }
  selectAccountAndDeriveKey(publicKey: string): void {
    this.identityService.derive({
      publicKey,
      transactionSpendingLimit: this.transactionSpendingLimitResponse,
      expirationDays: this.expirationDays,
    });
  }

  approveDerivedKey(publicKey: string): void {
    this.identityService.derive({
      publicKey,
      derivedPublicKey: this.derivedPublicKeyBase58Check,
      transactionSpendingLimit: this.transactionSpendingLimitResponse,
      expirationDays: this.expirationDays,
    });
  }
  onHover(i: number) {
    this.hoveredAccount = i;
  }
  endHover() {
    this.hoveredAccount = -1;
  }

  public truncatePublicKey(key: string): string {
    return truncatePublicKey(key);
  }
}

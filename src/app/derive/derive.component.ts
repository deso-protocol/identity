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
import { ActivatedRoute, Params, Router } from '@angular/router';
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
  validationErrors = false;
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
    // first grab the query params
    this.activatedRoute.queryParams
      .pipe(
        switchMap((params) => {
          // verify they sent the correct parameter permutation
          this.validationErrors = this.getParameterValidationErrors(params);
          if (this.validationErrors) {
            return throwError('invalid query parameter permutation');
          }
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
    // Set derive to true
    this.globalVars.derive = true;
  }

  selectAccountAndDeriveKey(publicKey: string): void {
    this.identityService.derive({
      publicKey,
      transactionSpendingLimit: this.transactionSpendingLimitResponse,
      expirationDays: this.expirationDays,
    });
  }

  approveDerivedKey(publicKey: string | undefined): void {
    if (!publicKey) return;
    this.identityService.derive({
      publicKey,
      derivedPublicKey: this.derivedPublicKeyBase58Check,
      transactionSpendingLimit: this.transactionSpendingLimitResponse,
      expirationDays: this.expirationDays,
    });
  }

  public truncatePublicKey(key: string | undefined): string {
    if (!key) return '';
    return truncatePublicKey(key);
  }

  private getParameterValidationErrors(params: Params): boolean {
    // listed out the different flows that can happen on the derive page
    // if the params do not match these permutations return false and display the error page
    const pkAndSpendingLimits =
      params.publicKeyBase58Check && params.transactionSpendingLimitResponse;

    const dkAndSpendingLimits =
      params.derivedPublicKey && params.transactionSpendingLimitResponse;

    const pkDkAndSpendingLimits =
      params.publicKeyBase58Check &&
      params.transactionSpendingLimitResponse &&
      params.derivedPublicKey;

    const deleteDerivedKey =
      params.publicKeyBase58Check &&
      params.deleteKey === 'true' &&
      params.derivedPublicKey;
    console.log({
      pkAndSpendingLimits,
      dkAndSpendingLimits,
      pkDkAndSpendingLimits,
      deleteDerivedKey,
    });
    return !(
      pkAndSpendingLimits ||
      dkAndSpendingLimits ||
      pkDkAndSpendingLimits ||
      deleteDerivedKey
    );
  }
}

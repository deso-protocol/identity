import { Component, OnInit } from '@angular/core';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import {
  BackendAPIService,
  TransactionSpendingLimitResponse,
} from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { UserProfile } from '../../types/identity';
import { ActivatedRoute, Params } from '@angular/router';
import { Observable } from 'rxjs';
type Accounts = { [key: string]: UserProfile } | {};
type DeriveParams = {
  publicKey?: string;
  derivedPublicKey?: string;
  deleteKey?: string;
  transactionSpendingLimitResponse?: any;
  expirationDays?: string;
};
@Component({
  selector: 'app-derive',
  templateUrl: './derive.component.html',
  styleUrls: ['./derive.component.scss'],
})
export class DeriveComponent implements OnInit {
  allUsers: Observable<Accounts> = this.backendApi.GetUserProfiles(
    this.accountService.getPublicKeys()
  );
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
    private backendApi: BackendAPIService,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    // first grab the query params
    this.activatedRoute.queryParams.subscribe((params: DeriveParams) => {
      // verify they sent the correct parameter permutation
      this.validationErrors = this.getParameterValidationErrors(params);
      if (this.validationErrors) {
        throw Error('invalid query parameter permutation');
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
      this.globalVars.derive = true;
    });
    // Set derive to true
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

  private getParameterValidationErrors(params: Params): boolean {
    // listed out the different flows that can happen on the derive page
    // if the params do not match these permutations return false and display the error page
    const pkAndSpendingLimits =
      params.publicKey && params.transactionSpendingLimitResponse;

    const dkAndSpendingLimits =
      params.derivedPublicKey && params.transactionSpendingLimitResponse;

    const pkDkAndSpendingLimits =
      params.publicKey &&
      params.transactionSpendingLimitResponse &&
      params.derivedPublicKey;

    const deleteDerivedKey =
      params.publicKey &&
      params.deleteKey === 'true' &&
      params.derivedPublicKey;
    return !(
      pkAndSpendingLimits ||
      dkAndSpendingLimits ||
      pkDkAndSpendingLimits ||
      deleteDerivedKey
    );
  }
}

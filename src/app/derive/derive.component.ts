import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { RouteNames } from 'src/app/app-routing.module';
import { SwalHelper } from '../../lib/helpers/swal-helper';
import { UserProfile } from '../../types/identity';
import { AccountService } from '../account.service';
import {
  BackendAPIService,
  TransactionSpendingLimitResponse,
} from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { IdentityService } from '../identity.service';
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
  hoveredAccount = -1;
  publicKeyBase58Check: string | undefined = undefined;
  derivedPublicKeyBase58Check: string | undefined = undefined;
  expirationDays = 30;
  deleteKey = false;
  isSingleAccount = false;
  validationErrors = false;
  blockHeight = 0;
  onApproveClick = async () =>
    this.approveDerivedKey(this.publicKeyBase58Check);

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.backendApi.GetAppState().subscribe((res) => {
      this.blockHeight = res.BlockHeight;
    });
    // first grab the query params
    this.activatedRoute.queryParams.subscribe((params: DeriveParams) => {
      // verify they sent the correct parameter permutation
      this.validationErrors = this.getParameterValidationErrors(params);
      if (this.validationErrors) {
        throw Error('invalid query parameter permutation');
      }
      if (params.publicKey) {
        if (!this.publicKeyBase58Check) {
          this.accountService.updateAccountInfo(params.publicKey, {
            lastLoginTimestamp: Date.now(),
          });
        }
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

  async approveDerivedKey(publicKey: string | undefined): Promise<void> {
    if (!publicKey) {
      return;
    }
    try {
      if (this.accountService.requiresMessagingKeyRandomness(publicKey)) {
        await this.getMessagingKeyRandomness(publicKey);
        return;
      }
    } catch (e) {
      console.error(e);
      await SwalHelper.fire({
        icon: 'error',
        title: 'Error getting messaging key randomness',
        html: `${e}`,
      });
      return;
    }
    if (this.transactionSpendingLimitResponse?.AccessGroupLimitMap) {
      this.transactionSpendingLimitResponse.AccessGroupLimitMap.forEach(
        (agl) => {
          if (!agl.AccessGroupOwnerPublicKeyBase58Check) {
            agl.AccessGroupOwnerPublicKeyBase58Check = publicKey;
          }
        }
      );
    }
    if (this.transactionSpendingLimitResponse?.AccessGroupMemberLimitMap) {
      this.transactionSpendingLimitResponse.AccessGroupMemberLimitMap.forEach(
        (agml) => {
          if (!agml.AccessGroupOwnerPublicKeyBase58Check) {
            agml.AccessGroupOwnerPublicKeyBase58Check = publicKey;
          }
        }
      );
    }
    return this.identityService.derive({
      publicKey,
      derivedPublicKey: this.derivedPublicKeyBase58Check,
      transactionSpendingLimit: this.transactionSpendingLimitResponse,
      expirationDays: this.expirationDays,
      blockHeight: this.blockHeight,
    });
  }

  async getMessagingKeyRandomness(publicKey: string): Promise<void> {
    const swalRes = await SwalHelper.fire({
      target: 'sign-messaging-randomness',
      icon: 'info',
      title: 'Generate Messaging Key',
      confirmButtonText: 'Approve',
      html: `Metamask will open and request that you sign a message.
          This is used to generate a key pair that will be used to encrypt and decrypt messages on the DeSo Blockchain.
          Messaging keys are required for derived keys to properly encrypt and decrypt messages`,
      showConfirmButton: true,
      showCancelButton: false,
      allowEscapeKey: false,
      allowOutsideClick: false,
    });
    if (!swalRes.isConfirmed) {
      return Promise.reject('User declined to sign messaging key randomness');
    }
    try {
      await this.accountService.getMessagingGroupStandardDerivation(
        publicKey,
        this.globalVars.defaultMessageKeyName
      );
    } catch (e) {
      return Promise.reject('Error getting messaing group derivation');
    }
  }

  onAccountSelected(publicKey: string): void {
    // first check if this user has a balance. If not, push them to the get-deso flow
    this.backendApi
      .GetUsersStateless(
        [publicKey],
        true /*SkipForLeaderboard*/,
        true /*IncludeBalance*/
      )
      .pipe(take(1))
      .subscribe((res) => {
        if (res.UserList?.[0]?.BalanceNanos === 0) {
          this.router.navigate(['/', RouteNames.GET_DESO], {
            queryParams: { publicKey },
            queryParamsHandling: 'merge',
          });
          return;
        }

        // If this user has already approved a derived key for login, then we can just log them in
        // without approval.
        if (this.globalVars.authenticatedUsers.has(publicKey)) {
          this.identityService.login({
            users: this.accountService.getEncryptedUsers(),
            publicKeyAdded: publicKey,
          });

          return;
        }

        // Otherwise, setting the public key will trigger the approval UI to show.
        this.publicKeyBase58Check = publicKey;
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
      deleteDerivedKey ||
      params.transactionSpendingLimitResponse
    );
  }
}

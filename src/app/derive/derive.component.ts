import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {DerivePayload, IdentityService} from '../identity.service';
import {BackendAPIService, CoinLimitOperationString, CoinOperationLimitMap, TransactionSpendingLimitResponse, User} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';
import {GoogleDriveService} from '../google-drive.service';
import {UserProfile} from '../../types/identity';
import {ActivatedRoute, Router} from '@angular/router';
import {RouteNames} from '../app-routing.module';
import { TransactionSpendingLimit } from 'src/lib/deso/transaction';

@Component({
  selector: 'app-derive',
  templateUrl: './derive.component.html',
  styleUrls: ['./derive.component.scss']
})
export class DeriveComponent implements OnInit {

  allUsers: {[key: string]: UserProfile} = {};
  transactionSpendingLimitHex: string | undefined;
  transactionSpendingLimitResponse: TransactionSpendingLimitResponse | undefined;
  hasUsers = false;

  publicKeyBase58Check: string | undefined = undefined;
  derivedPublicKeyBase58Check: string | undefined = undefined;
  expirationDays = 30;
  deleteKey = false;


  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private googleDrive: GoogleDriveService,
    private backendApi: BackendAPIService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    this.activatedRoute.queryParams.subscribe(params => {
      if (params.publicKey) {
        this.publicKeyBase58Check = params.publicKey;
      }
      if (params.derivedPublicKey) {
        this.derivedPublicKeyBase58Check = params.derivedPublicKey;
      }
      // We can only revoke if we have both the public key and derived public key from query params.
      if (params.deleteKey && this.publicKeyBase58Check && this.derivedPublicKeyBase58Check) {
        this.deleteKey = params.deleteKey === 'true';
        // We don't want or need to parse transaction spending limit when revoking derived key,
        // so we initialize a spending limit object with no permissions
        this.transactionSpendingLimitResponse = { GlobalDESOLimit: 0 };
        this.backendApi.GetTransactionSpendingLimitHexString(
          this.transactionSpendingLimitResponse
        ).subscribe((res) => {
          this.transactionSpendingLimitHex = res;
        });
        // Setting expiration days to 0 forces us to have a minimum transaction size that is still valid.
        this.expirationDays = 0;
        return;
      }
      if (params.transactionSpendingLimitResponse) {
        this.transactionSpendingLimitResponse = JSON.parse(decodeURIComponent(params.transactionSpendingLimitResponse));
        // TODO: There is a small attack surface here. If someone gains control of the
        // backendApi node, they can swap a fake value into here, and trick the user
        // into giving up control of their key. The solution is to force users to pass
        // the transactionSpendingLimitHex directly, but this is a worse developer
        // experience. So we trade a little bit of security for developer convenience
        // here, and do the conversion in Identity rather than forcing the devs to do it.
        this.backendApi.GetTransactionSpendingLimitHexString(
          this.transactionSpendingLimitResponse as TransactionSpendingLimitResponse
        ).subscribe((res) => {
          this.transactionSpendingLimitHex = res;
        });
      }
      if (params.expirationDays) {
        const numDays = parseInt(params.expirationDays, 10);
        if (numDays > 0) {
          this.expirationDays = numDays;
        }
      }
    });
    // Set derive to true
    this.globalVars.derive = true;
  }

  redirectLoadSeed(): void {
    this.router.navigate(['/', RouteNames.LOAD_SEED], { queryParamsHandling: 'merge' });
  }

  redirectSignUp(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP], { queryParamsHandling: 'merge' });
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccountAndDeriveKey(publicKey: string): void {
    this.derive(publicKey);
  }

  approveDerivedKey(): void {
    if (!this.publicKeyBase58Check) {
      return;
    }
    this.derive(this.publicKeyBase58Check);
  }

  derive(publicKey: string): void {
    this.identityService.derive({
      publicKey,
      derivedPublicKey: this.derivedPublicKeyBase58Check,
      transactionSpendingLimitHex: this.transactionSpendingLimitHex,
      expirationDays: this.expirationDays,
    });
  }
}

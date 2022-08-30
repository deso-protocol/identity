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
  selector: 'app-default-key',
  templateUrl: './default-key.component.html',
  styleUrls: ['./default-key.component.scss']
})
export class DefaultKeyComponent implements OnInit {

  allUsers: {[key: string]: UserProfile} = {};
  hasUsers = false;

  publicKeyBase58Check: string | undefined = undefined;
  appPublicKeyBase58Check: string | undefined = undefined;

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
      if (params.appPublicKey) {
        this.appPublicKeyBase58Check = params.appPublicKey;
      }
    });
  }

  // selectAccountAndGetDefaultKey(publicKey: string): void {
  //   this.identityService.getDefaultKey({
  //     publicKey
  //   })
  // }

  selectAccountAndApproveDefaultKey(pk: string): void {
    if (!pk || !this.appPublicKeyBase58Check) {
      return;
    }
    this.identityService.approveDefaultKey({
      publicKey: pk,
      appPublicKey: this.appPublicKeyBase58Check
    });
  }

  approveDefaultKey(): void {
    if (!this.publicKeyBase58Check || !this.appPublicKeyBase58Check) {
      return;
    }
    this.identityService.approveDefaultKey({
      publicKey: this.publicKeyBase58Check,
      appPublicKey: this.appPublicKeyBase58Check
    });
  }
}

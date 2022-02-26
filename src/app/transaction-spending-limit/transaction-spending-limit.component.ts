import { Component, Input, OnInit } from '@angular/core';
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
  selector: 'app-transaction-spending-limit',
  templateUrl: './transaction-spending-limit.component.html',
  styleUrls: ['./transaction-spending-limit.component.scss']
})
export class TransactionSpendingLimitComponent implements OnInit {

  @Input() transactionSpendingLimitResponse: TransactionSpendingLimitResponse = {
    GlobalDESOLimit: 0,
  };
  hasUsers = false;
  derivePayload: DerivePayload | null = null;
  userMap: { [k: string]: User } = {};

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
  ) { }

  ngOnInit(): void {
    const publicKeysToFetch = [...new Set(this.getPublicKeysFromCoinOperationLimitMap(
      this.transactionSpendingLimitResponse?.CreatorCoinOperationLimitMap
    ).concat(this.getPublicKeysFromCoinOperationLimitMap(
      this.transactionSpendingLimitResponse?.DAOCoinOperationLimitMap
    )))];

    this.backendApi.GetUsersStateless(publicKeysToFetch, true).subscribe((res) => {
      res.UserList.map((user) => {
        this.userMap[user.PublicKeyBase58Check] = user;
      })
    })
  }

  getPublicKeysFromCoinOperationLimitMap(coinOpLimitMap: CoinOperationLimitMap<CoinLimitOperationString> | undefined): string[] {
    return coinOpLimitMap ? Object.keys(coinOpLimitMap) : [];
  }

  ObjectKeyLength(obj: { [k: string]: any} | undefined): number {
    if (!obj) {
      return 0;
    }
    return Object.keys(obj).length;
  }

  getUsernameFromUserMap(publicKey: string): string {
    if (publicKey === "") {
      return "ANY CREATOR";
    }
    return this.userMap[publicKey]?.ProfileEntryResponse?.Username || publicKey;
  }

  cleanOperationName(opName: string): string {
    return opName.split("_").map((token) =>
      token.toLocaleLowerCase() === "nft" ? "NFT" : token.charAt(0).toUpperCase() + token.slice(1)).join(" ");
  }
}

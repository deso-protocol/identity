import { Component, Input, OnInit } from '@angular/core';
import {BackendAPIService, CoinLimitOperationString, CoinOperationLimitMap, TransactionSpendingLimitResponse, User} from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';

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
  userMap: { [k: string]: User } = {};
  showTransactions: boolean = false;
  
  static TransactionLimitsSection = "Transaction Limits";
  static CreatorCoinLimitsSection = "Creator Coins";
  static DAOCoinLimitsSection = "DAOs";
  static NFTLimitsSection = "NFTs";
  
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;
  constructor(
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService,
  ) { }

  ngOnInit(): void {
    const publicKeysToFetch = [...new Set<string>(this.getPublicKeysFromCoinOperationLimitMap(
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

  getPublicKeysFromCoinOperationLimitMap(
    coinOpLimitMap: CoinOperationLimitMap<CoinLimitOperationString> | undefined): string[] {
    return coinOpLimitMap ? Object.keys(coinOpLimitMap) : [];
  }
}

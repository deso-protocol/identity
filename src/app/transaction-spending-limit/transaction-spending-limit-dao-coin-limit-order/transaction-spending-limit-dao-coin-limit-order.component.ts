import { Component, Input, OnInit } from '@angular/core';
import {BackendAPIService,
  CreatorCoinLimitOperationString,
  DAOCoinLimitOperationString,
  DAOCoinLimitOrderLimitItem,
  OperationToCountMap, User} from '../../backend-api.service';
import {GlobalVarsService} from '../../global-vars.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-dao-coin-limit-order',
  templateUrl: './transaction-spending-limit-dao-coin-limit-order.component.html',
  styleUrls: ['./transaction-spending-limit-dao-coin-limit-order.component.scss']
})
export class TransactionSpendingLimitDaoCoinLimitOrderComponent implements OnInit {

  @Input() daoCoinLimitOrderLimitItem: DAOCoinLimitOrderLimitItem | undefined; 
  expandCreator: boolean = false;
  defaultNumShown: number = 5;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
  ) { }

  ngOnInit(): void {
  }

  getOperationsString(operationsMap: OperationToCountMap<CreatorCoinLimitOperationString> | OperationToCountMap<DAOCoinLimitOperationString> | undefined): string {
    if (!operationsMap) {
      return "";
    }
    return Object.keys(operationsMap).sort().map(
      (op) => this.globalVars.cleanSpendingLimitOperationName(op)
    ).join(", ");
  }
}

import { Component, Input, OnInit } from '@angular/core';
import {
  CreatorCoinLimitOperationString,
  DAOCoinLimitOperationString,
  OperationToCountMap,
  User,
} from '../../backend-api.service';
import { GlobalVarsService } from '../../global-vars.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-coin',
  templateUrl: './transaction-spending-limit-coin.component.html',
  styleUrls: ['./transaction-spending-limit-coin.component.scss'],
})
export class TransactionSpendingLimitCoinComponent implements OnInit {
  @Input() coinPublicKey: string = '';
  @Input() coinOperationMap:
    | OperationToCountMap<CreatorCoinLimitOperationString>
    | OperationToCountMap<DAOCoinLimitOperationString>
    | undefined;

  @Input() user: User | undefined;
  expandCreator: boolean = false;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  constructor(public globalVars: GlobalVarsService) {}

  ngOnInit(): void {}

  getOperationsString(
    operationsMap:
      | OperationToCountMap<CreatorCoinLimitOperationString>
      | OperationToCountMap<DAOCoinLimitOperationString>
      | undefined
  ): string {
    if (!operationsMap) {
      return '';
    }
    return Object.keys(operationsMap)
      .sort()
      .map((op) => this.globalVars.cleanSpendingLimitOperationName(op))
      .join(', ');
  }
}

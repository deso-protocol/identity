import { Component, Input, OnInit } from '@angular/core';
import { GlobalVarsService } from 'src/app/global-vars.service';
import {
  LockupLimitMapItem,
  LockupLimitOperationString,
  LockupLimitScopeType,
  User,
} from '../../backend-api.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-lockup',
  templateUrl: './transaction-spending-limit-lockup.component.html',
  styleUrls: ['./transaction-spending-limit-lockup.component.scss'],
})
export class TransactionSpendingLimitLockupComponent implements OnInit {
  @Input() lockupLimitMapItem: LockupLimitMapItem | undefined;
  @Input() appUser: User | undefined;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;
  LockupLimitScopeType = LockupLimitScopeType;

  constructor(public globalVars: GlobalVarsService) {}

  ngOnInit(): void {}

  getOperationString(): string {
    switch (this.lockupLimitMapItem?.Operation) {
      case LockupLimitOperationString.ANY:
        return 'Any';
      case LockupLimitOperationString.COIN_LOCKUP:
        return 'Lockup';
      case LockupLimitOperationString.COIN_LOCKUP_TRANSFER:
        return 'Transfer';
      case LockupLimitOperationString.UPDATE_COIN_LOCKUP_YIELD_CURVE:
        return 'Update lockup yield curve';
      case LockupLimitOperationString.UPDATE_COIN_LOCKUP_TRANSFER_RESTRICTIONS:
        return 'Update transfer restriction';
      case LockupLimitOperationString.COIN_UNLOCK:
        return 'Unlock coins';
      default:
        return '';
    }
  }
}

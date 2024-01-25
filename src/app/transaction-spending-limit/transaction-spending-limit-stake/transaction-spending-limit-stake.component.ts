import { Component, Input, OnInit } from '@angular/core';
import { GlobalVarsService } from 'src/app/global-vars.service';
import {
  StakeLimitMapItem,
  UnlockStakeLimitMapItem,
  UnstakeLimitMapItem,
  User,
} from '../../backend-api.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-stake',
  templateUrl: './transaction-spending-limit-stake.component.html',
  styleUrls: ['./transaction-spending-limit-stake.component.scss'],
})
export class TransactionSpendingLimitStakeComponent implements OnInit {
  @Input() stakeLimitMapItem:
    | StakeLimitMapItem
    | UnstakeLimitMapItem
    | UnlockStakeLimitMapItem
    | undefined;
  @Input() operationName: string = '';
  @Input() appUser: User | undefined;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  constructor(public globalVars: GlobalVarsService) {}

  ngOnInit(): void {}

  getOpCountString(): string {
    switch (this.operationName) {
      case 'Stake':
        return (
          this.hexNanosToUnitString(
            (this.stakeLimitMapItem as StakeLimitMapItem)?.StakeLimit as string
          ) + ' DESO'
        );
      case 'Unstake':
        return (
          this.hexNanosToUnitString(
            (this.stakeLimitMapItem as UnstakeLimitMapItem)
              ?.UnstakeLimit as string
          ) + ' DESO'
        );
      case 'Unlock Stake':
        return (
          this.stakeLimitMapItem as UnlockStakeLimitMapItem
        )?.OpCount.toString();
      default:
        return '';
    }
  }

  hexNanosToUnitString(baseUnits: string): string {
    return this.nanosToUnitString(parseInt(baseUnits, 16));
  }

  nanosToUnitString(baseUnits: number): string {
    return this.toFixedLengthDecimalString(baseUnits / 1e9);
  }

  toFixedLengthDecimalString(num: number): string {
    // Change nanos into a formatted string of units. This combination of toFixed and regex removes trailing zeros.
    // If we do a regular toString(), some numbers can be represented in E notation which doesn't look as good.
    const formattedNum = num.toFixed(9).replace(/^(\d*\.\d*?[1-9]?)0+$/, '$1');
    // Integers may have a trailing decimal place, so if we end with a decimal place, we slice off the last character.
    return formattedNum.endsWith('.')
      ? formattedNum.slice(0, formattedNum.length - 1)
      : formattedNum;
  }
}

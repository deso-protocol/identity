import { Component, Input, OnInit } from '@angular/core';
import { TruncateAddressPipe } from 'src/lib/pipes/truncate-deso-address.pipe';
import { DAOCoinLimitOrderLimitItem, User } from '../../backend-api.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-dao-coin-limit-order',
  templateUrl:
    './transaction-spending-limit-dao-coin-limit-order.component.html',
  styleUrls: [
    './transaction-spending-limit-dao-coin-limit-order.component.scss',
  ],
})
export class TransactionSpendingLimitDaoCoinLimitOrderComponent
  implements OnInit
{
  @Input() daoCoinLimitOrderLimitItem: DAOCoinLimitOrderLimitItem | undefined;
  @Input() buyingUser: User | undefined;
  @Input() sellingUser: User | undefined;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  ngOnInit(): void {}
}

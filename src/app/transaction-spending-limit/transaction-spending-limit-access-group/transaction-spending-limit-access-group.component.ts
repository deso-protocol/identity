import { Component, Input, OnInit } from '@angular/core';
import { GlobalVarsService } from 'src/app/global-vars.service';
import {
  AccessGroupLimitMapItem,
  AccessGroupOperationString,
  AccessGroupScopeType,
  BackendAPIService,
  User,
} from '../../backend-api.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-access-group',
  templateUrl: './transaction-spending-limit-access-group.component.html',
  styleUrls: ['./transaction-spending-limit-access-group.component.scss'],
})
export class TransactionSpendingLimitAccessGroupComponent implements OnInit {
  @Input() accessGroupLimitMapItem: AccessGroupLimitMapItem | undefined;
  @Input() appUser: User | undefined;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  constructor(
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {}

  isScoped(): boolean {
    return (
      this.accessGroupLimitMapItem?.ScopeType === AccessGroupScopeType.SCOPED
    );
  }

  getOperationString(): string {
    switch (this.accessGroupLimitMapItem?.OperationType) {
      case AccessGroupOperationString.ANY:
        return 'Create or update';
      case AccessGroupOperationString.CREATE:
        return 'Create';
      case AccessGroupOperationString.UPDATE:
        return 'Update';
      default:
        return '';
    }
  }
}

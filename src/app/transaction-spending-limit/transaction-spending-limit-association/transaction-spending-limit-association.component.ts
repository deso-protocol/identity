import {Component, Input, OnInit} from '@angular/core';
import {GlobalVarsService} from 'src/app/global-vars.service';
import {
  AssociationAppScopeType,
  AssociationLimitMapItem,
  AssociationOperationString,
  BackendAPIService,
  User
} from '../../backend-api.service';
import {TransactionSpendingLimitComponent} from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-association',
  templateUrl: './transaction-spending-limit-association.component.html',
  styleUrls: ['./transaction-spending-limit-association.component.scss'],
})
export class TransactionSpendingLimitAssociationComponent implements OnInit {
  @Input() associationLimitMapItem: AssociationLimitMapItem | undefined;
  @Input() appUser: User | undefined;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  constructor(
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {
    console.log(this.appUser);
  }

  getOperationString(): string {
    switch (this.associationLimitMapItem?.AssociationOperation) {
      case AssociationOperationString.ANY:
        return 'Create or delete';
      case AssociationOperationString.CREATE:
        return 'Create';
      case AssociationOperationString.DELETE:
        return 'Delete';
      default:
        return '';
    }
  }

  isScoped(): boolean {
    return this.associationLimitMapItem?.AppScopeType === AssociationAppScopeType.SCOPED;
  }
}

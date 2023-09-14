import { Component, Input, OnInit } from '@angular/core';
import { Account, LoginMethod } from '../../../types/identity';
import { AccountService } from '../../account.service';

@Component({
  selector: 'account-list-item',
  templateUrl: './account-list-item.component.html',
  styleUrls: ['./account-list-item.component.scss'],
})
export class AccountListItemComponent implements OnInit {
  @Input() account!: Account;
  @Input() onSelectAccount: (account: Account) => void = () => {};
  @Input() onRemoveAccount: (account: Account) => void = () => {};

  constructor(public accountService: AccountService) {}

  ngOnInit(): void {
    if (typeof this.account === 'undefined') {
      throw new Error('AccountListItemComponent: account is a required input.');
    }
  }

  getLoginMethodIcon(loginMethod: LoginMethod = LoginMethod.DESO): string {
    return {
      [LoginMethod.DESO]: 'assets/logo-deso-mark.svg',
      [LoginMethod.GOOGLE]: 'assets/google_logo.svg',
      [LoginMethod.METAMASK]: 'assets/metamask.png',
    }[loginMethod];
  }
}

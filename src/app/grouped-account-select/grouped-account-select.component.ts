import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { take } from 'rxjs/operators';
import { LoginMethod } from 'src/types/identity';
import { SwalHelper } from '../../lib/helpers/swal-helper';
import { AccountService } from '../account.service';
import { BackendAPIService } from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { isValid32BitUnsignedInt } from './account-number';

@Component({
  selector: 'grouped-account-select',
  templateUrl: './grouped-account-select.component.html',
  styleUrls: ['./grouped-account-select.component.scss'],
})
export class GroupedAccountSelectComponent implements OnInit {
  @Output() onAccountSelect: EventEmitter<string> = new EventEmitter();

  /**
   * Accounts are grouped by root public key. The root public key is the public
   * key derived at account index 0 for a given seed phrase.
   */
  accountGroups: Map<
    string,
    {
      showRecoverSubAccountInput?: boolean;
      accounts: {
        publicKey: string;
        accountNumber: number;
        balanceNanos: number;
        username?: string;
        profilePic?: string;
      }[];
    }
  > = new Map();

  /**
   * Bound to a UI text input and used to recover a sub account.
   */
  accountNumberToRecover = 0;

  constructor(
    public accountService: AccountService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService
  ) {}

  ngOnInit(): void {
    this.initializeAccountGroups();
  }

  initializeAccountGroups() {
    const storedUsers = Object.entries(this.accountService.getRootLevelUsers());
    const accountGroupsByRootKey = new Map<
      string,
      { publicKey: string; accountNumber: number }[]
    >();

    for (const [rootPublicKey, userInfo] of storedUsers) {
      const accounts = !userInfo.isHidden
        ? [
            {
              publicKey: rootPublicKey,
              accountNumber: 0,
            },
          ]
        : [];

      const subAccounts = userInfo?.subAccounts ?? [];

      for (const subAccount of subAccounts) {
        if (subAccount.isHidden) {
          continue;
        }

        const publicKeyBase58 =
          this.accountService.getAccountPublicKeyBase58Enc(
            rootPublicKey,
            subAccount.accountNumber
          );

        accounts.push({
          publicKey: publicKeyBase58,
          accountNumber: subAccount.accountNumber,
        });
      }

      accountGroupsByRootKey.set(rootPublicKey, accounts);
    }

    const profileKeysToFetch = Array.from(accountGroupsByRootKey.values())
      .flat()
      .map((a) => a.publicKey);

    // Fetch profiles and balances so we can show usernames in the UI (if we have them)
    this.backendApi
      .GetUserProfiles(profileKeysToFetch)
      .pipe(take(1))
      .subscribe((users) => {
        // TODO: revisit sorting. we want to sort by last login timestamp DESC, at both the
        // group level and the sub group levels.
        Array.from(accountGroupsByRootKey.entries()).forEach(
          ([key, accounts]) => {
            this.accountGroups.set(key, {
              showRecoverSubAccountInput: false,
              accounts: accounts.map((account) => ({
                ...account,
                ...users[account.publicKey],
              })),
            });
          }
        );
      });
  }

  getLoginMethodIcon(loginMethod: LoginMethod = LoginMethod.DESO): string {
    return {
      [LoginMethod.DESO]: 'assets/logo-deso-mark.svg',
      [LoginMethod.GOOGLE]: 'assets/google_logo.svg',
      [LoginMethod.METAMASK]: 'assets/metamask.png',
    }[loginMethod];
  }

  selectAccount(publicKey: string) {
    this.accountService.updateAccountInfo(publicKey, {
      lastLoginTimestamp: Date.now(),
    });
    this.onAccountSelect.emit(publicKey);
  }

  hideAccount(groupKey: string, publicKey: string, accountNumber: number) {
    SwalHelper.fire({
      title: 'Remove Account?',
      // TODO: revisit this copy and make sure it makes sense for both the main account and sub accounts
      text: 'Do you really want to remove this account? Your account will be irrecoverable if you lose your seed phrase or login credentials.',
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        this.accountService.updateAccountInfo(publicKey, { isHidden: true });
        const group = this.accountGroups.get(groupKey) ?? {
          accounts: [],
        };
        group.accounts = group.accounts.filter(
          (a) => a.accountNumber !== accountNumber
        );
        this.accountGroups.set(groupKey, group);
      }
    });
  }

  addSubAccount(
    rootPublicKey: string,
    { accountNumber }: { accountNumber?: number } = {}
  ) {
    const addedAccountNumber = this.accountService.addSubAccount(
      rootPublicKey,
      { accountNumber }
    );
    const publicKeyBase58 = this.accountService.getAccountPublicKeyBase58Enc(
      rootPublicKey,
      addedAccountNumber
    );
    // Check if this account has profile, balance, etc, and add it to the list.
    // TODO: some loading state while fetching profile data.
    this.backendApi
      .GetUserProfiles([publicKeyBase58])
      .pipe(take(1))
      .subscribe((users) => {
        const account = {
          publicKey: publicKeyBase58,
          accountNumber: addedAccountNumber,
          ...users[publicKeyBase58],
        };

        const group = this.accountGroups.get(rootPublicKey) ?? {
          accounts: [],
        };

        // if the account is already in the list, don't add it again...
        if (!group.accounts.find((a) => a.accountNumber === accountNumber)) {
          group.accounts.push(account);
        }

        this.accountGroups.set(rootPublicKey, group);
      });
  }

  /**
   * Shows and hides the "recover sub account" text input.
   */
  toggleRecoverSubAccountForm(rootPublicKey: string) {
    const group = this.accountGroups.get(rootPublicKey);
    if (!group) {
      return;
    }
    group.showRecoverSubAccountInput = !group.showRecoverSubAccountInput;
    this.accountGroups.set(rootPublicKey, group);
  }

  recoverSubAccount(event: SubmitEvent, rootPublicKey: string) {
    event.preventDefault();

    if (!isValid32BitUnsignedInt(this.accountNumberToRecover)) {
      SwalHelper.fire({
        title: 'Invalid Account Number',
        html: `Please enter a valid account number.`,
      });
      return;
    }

    this.addSubAccount(rootPublicKey, { accountNumber: this.accountNumberToRecover });
  }

  getAccountDisplayName(account: { username?: string, publicKey: string }) {
    return account.username ?? account.publicKey;
  }
}

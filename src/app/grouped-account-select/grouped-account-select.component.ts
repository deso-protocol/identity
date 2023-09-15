import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { take } from 'rxjs/operators';
import { LoginMethod, SubAccountMetadata, UserProfile } from 'src/types/identity';
import { SwalHelper } from '../../lib/helpers/swal-helper';
import { AccountService } from '../account.service';
import { BackendAPIService } from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { isValid32BitUnsignedInt } from './account-number';

type AccountViewModel = SubAccountMetadata & UserProfile & { publicKey: string };

function sortAccounts(a: AccountViewModel, b: AccountViewModel) {
  // sort accounts by last login timestamp DESC,
  // secondarily by balance DESC
  return (
    (b.lastLoginTimestamp ?? 0) - (a.lastLoginTimestamp ?? 0) ||
    b.balanceNanos - a.balanceNanos
  );
}

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
      accounts: AccountViewModel[];
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
    const storedUsers = Object.entries(
      this.accountService.getRootLevelUsers()
    ).sort(([kA, vA], [kb, vB]) => {
      // sort groups by last login timestamp DESC. We don't have balance info yet.
      return (vB.lastLoginTimestamp ?? 0) - (vA.lastLoginTimestamp ?? 0);
    });
    const accountGroupsByRootKey = new Map<
      string,
      { publicKey: string; accountNumber: number; lastLoginTimestamp: number }[]
    >();

    for (const [rootPublicKey, userInfo] of storedUsers) {
      const accounts = !userInfo.isHidden
        ? [
            {
              publicKey: rootPublicKey,
              accountNumber: 0,
              lastLoginTimestamp: userInfo.lastLoginTimestamp ?? 0,
            },
          ]
        : [];

      const subAccounts = userInfo?.subAccounts ?? [];

      for (const subAccount of subAccounts) {
        if (subAccount.isHidden) {
          continue;
        }

        const publicKeyBase58 = this.accountService.getAccountPublicKeyBase58(
          rootPublicKey,
          subAccount.accountNumber
        );

        accounts.push({
          publicKey: publicKeyBase58,
          accountNumber: subAccount.accountNumber,
          lastLoginTimestamp: subAccount.lastLoginTimestamp ?? 0,
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
        Array.from(accountGroupsByRootKey.entries()).forEach(
          ([key, accounts], i) => {
            this.accountGroups.set(key, {
              showRecoverSubAccountInput: false,
              accounts: accounts
                .map((account, j) => ({
                  ...account,
                  ...users[account.publicKey],
                }))
                .sort(sortAccounts),
            });
          }
        );
      });
  }

  /**
   * We need this to address angular's weird default sorting of Maps by key when
   * iterating in the template. See this issue for details. We just want to
   * preserve the natural order of the Map entries:
   * https://github.com/angular/angular/issues/31420
   */
  keyValueSort() {
    return 1;
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
    const publicKeyBase58 = this.accountService.getAccountPublicKeyBase58(
      rootPublicKey,
      addedAccountNumber
    );
    // Check if this account has profile, balance, etc, and add it to the list.
    // TODO: some loading state while fetching profile data?
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
          // TODO: should we sort here?
          group.accounts.push(account);
          group.accounts.sort(sortAccounts);
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

    this.addSubAccount(rootPublicKey, {
      accountNumber: this.accountNumberToRecover,
    });
  }

  getAccountDisplayName(account: { username?: string; publicKey: string }) {
    return account.username ?? account.publicKey;
  }
}

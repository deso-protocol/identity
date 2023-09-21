import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { finalize, take } from 'rxjs/operators';
import {
  LoginMethod,
  SubAccountMetadata,
  UserProfile,
} from 'src/types/identity';
import Swal from 'sweetalert2';
import { isValid32BitUnsignedInt } from '../../lib/account-number';
import { AccountService } from '../account.service';
import { BackendAPIService } from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { BackupSeedDialogComponent } from './backup-seed-dialog/backup-seed-dialog.component';
import { RemoveAccountDialogComponent } from './remove-account-dialog/remove-account-dialog.component';

type AccountViewModel = SubAccountMetadata &
  UserProfile & { publicKey: string } & { lastUsed?: boolean };

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

  /**
   * UI loading state flag.
   */
  loadingAccounts: boolean = false;

  get hasVisibleAccounts() {
    // if any group has at least 1 visible account, return true.
    return !!Array.from(this.accountGroups.values()).find(
      (group) => group.accounts.length > 0
    );
  }

  constructor(
    public accountService: AccountService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeAccountGroups();
  }

  initializeAccountGroups() {
    this.loadingAccounts = true;
    const storedUsers = Object.entries(
      this.accountService.getRootLevelUsers()
    ).sort(
      (
        [kA, { lastLoginTimestamp: timestampA = 0 }],
        [kb, { lastLoginTimestamp: timestampB = 0 }]
      ) => {
        // sort groups by last login timestamp DESC. We don't have balance info here.
        return timestampB - timestampA;
      }
    );
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
      .pipe(
        take(1),
        finalize(() => (this.loadingAccounts = false))
      )
      .subscribe((users) => {
        Array.from(accountGroupsByRootKey.entries()).forEach(
          ([key, accounts]) => {
            this.accountGroups.set(key, {
              showRecoverSubAccountInput: false,
              accounts: accounts
                .map((account, j) => ({
                  ...account,
                  ...users[account.publicKey],
                }))
                .sort(sortAccounts),
            });

            // get the first account in the list and set it as the lastUsed.
            const firstKey = this.accountGroups.keys().next().value;
            const firstGroup = this.accountGroups.get(firstKey);
            if (firstGroup) {
              firstGroup.accounts[0].lastUsed = true;
              this.accountGroups.set(firstKey, firstGroup);
            }
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

  hideAccount(groupKey: string, account: AccountViewModel) {
    // NOTE: if there is at least 1 sub account left in the group after hiding this account,
    // the user only needs the account number to recover it. If there are no sub accounts left,
    // the user needs the seed phrase + the account number to recover it.
    const group = this.accountGroups.get(groupKey) ?? {
      accounts: [],
    };
    // get a copy of the underlying array so we can preview what it looks like when hiding this account
    const hiddenPreview = group.accounts
      .slice()
      .filter((a) => a.accountNumber !== account.accountNumber);

    const dialogRef = this.dialog.open(RemoveAccountDialogComponent, {
      data: {
        publicKey: account.publicKey,
        accountNumber: account.accountNumber,
        username: account.username,
        isLastAccountInGroup: hiddenPreview.length === 0,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.accountService.updateAccountInfo(account.publicKey, {
          isHidden: true,
        });
        group.accounts = hiddenPreview;
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
          // Insert recovered/added account at the top of the list so
          // easy to see that it was added.
          group.accounts.unshift(account);
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
      Swal.fire({
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

  isMetaMaskAccountGroup(rootPublicKey: string) {
    const rootAccount = this.accountService.getAccountInfo(rootPublicKey);
    return this.accountService.isMetamaskAccount(rootAccount);
  }

  shouldShowExportSeedButton(rootPublicKey: string) {
    const rootAccount = this.accountService.getAccountInfo(rootPublicKey);
    return !rootAccount.exportDisabled;
  }

  exportSeed(rootPublicKey: string) {
    const dialogRef = this.dialog.open(BackupSeedDialogComponent, {
      data: { rootPublicKey },
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log(`Dialog result: ${result}`);
    });
  }
}

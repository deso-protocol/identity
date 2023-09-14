import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { take } from 'rxjs/operators';
import { LoginMethod } from 'src/types/identity';
import { SwalHelper } from '../../lib/helpers/swal-helper';
import { AccountService } from '../account.service';
import { BackendAPIService } from '../backend-api.service';

@Component({
  selector: 'app-account-select-v2',
  templateUrl: './account-select-v2.component.html',
  styleUrls: ['./account-select-v2.component.scss'],
})
export class AccountSelectV2Component implements OnInit {
  @Output() onAccountSelect: EventEmitter<string> =
    new EventEmitter();
  @Input() componentTitle = 'Select an account';

  accountGroups: Map<
    string,
    {
      showRecoverSubAccountInput?: boolean;
      accounts: {
        publicKey: string;
        accountNumber: number;
        username?: string;
        profilePic?: string;
      }[];
    }
  > = new Map();

  accountNumberToRecover: string | null = null;

  constructor(
    public accountService: AccountService,
    private backendApi: BackendAPIService
  ) {}

  ngOnInit(): void {
    const storedUsers = Object.entries(this.accountService.getPrivateUsers());
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

      const subAccounts = this.accountService.getSubAccounts(rootPublicKey);

      for (const subAccount of subAccounts) {
        if (subAccount.isHidden) {
          continue;
        }

        const publicKeyBase58 = this.accountService.getAccountPublicKeyBase58Enc(
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
    this.accountService.setLastLoginTimestamp(publicKey);
    this.onAccountSelect.emit(publicKey);
  }

  removeAccount(publicKey: string) {
    SwalHelper.fire({
      title: 'Remove Account?',
      // TODO: revisit this copy and make sure it makes sense for both the main account and sub accounts
      text: 'Do you really want to remove this account? Your account will be irrecoverable if you lose your seed phrase or login credentials.',
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        this.accountService.hideUser(publicKey);
        const rootKeyLookupMap = this.accountService.getSubAccountReverseLookupMap();
        const mapping = rootKeyLookupMap[publicKey];
        const rootPublicKey = mapping?.lookupKey;

        if (!rootPublicKey) {
          throw new Error(`Failed to find root public key for ${publicKey}`);
        }

        const group = this.accountGroups.get(rootPublicKey) ?? {
          accounts: [],
        };
        group.accounts = group.accounts.filter(
          (a) => a.accountNumber !== mapping.accountNumber
        );
        this.accountGroups.set(rootPublicKey, group);
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
        group.accounts.push(account);
        this.accountGroups.set(rootPublicKey, group);
      });
  }

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
    // TODO: better validation.
    const isValidIntegerValue = /^\d{1,7}$/g.test(
      this.accountNumberToRecover ?? ''
    );
    // We arbitrarily cap the account number to max 8 digits. This is to prevent
    // users from entering a string number value that is too large to fit into a
    // 32-bit integer.
    // TODO: figure out how to handle the case where the user enters the max value and then tries to add another account...
    if (!isValidIntegerValue) {
      SwalHelper.fire({
        title: 'Invalid Account Number',
        html: `Please enter a valid account number.`,
      });
      return;
    }

    const accountNumber = parseInt(this.accountNumberToRecover ?? '', 10);

    this.addSubAccount(rootPublicKey, { accountNumber });
  }
}

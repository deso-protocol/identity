import { Component, Input, OnInit } from '@angular/core';
import {
  AccessGroupLimitMapItem,
  AccessGroupMemberLimitMapItem,
  AssociationLimitMapItem,
  BackendAPIService,
  CoinLimitOperationString,
  CoinOperationLimitMap,
  DAOCoinLimitOrderLimitMap,
  LockupLimitMapItem,
  StakeLimitMapItem,
  TransactionSpendingLimitResponse,
  UnlockStakeLimitMapItem,
  UnstakeLimitMapItem,
  User,
} from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';

@Component({
  selector: 'app-transaction-spending-limit',
  templateUrl: './transaction-spending-limit.component.html',
  styleUrls: ['./transaction-spending-limit.component.scss'],
})
export class TransactionSpendingLimitComponent implements OnInit {
  @Input() transactionSpendingLimitResponse: TransactionSpendingLimitResponse =
    {
      GlobalDESOLimit: 0,
    };
  @Input() onApproveClick: () => Promise<void> = async () => {};
  hasUsers = false;
  userMap: { [k: string]: User } = {};
  showTransactions: boolean = false;
  isPendingApprove = false;
  static TransactionLimitsSection = 'Transaction Limits';
  static CreatorCoinLimitsSection = 'Creator Coins';
  static DAOCoinLimitsSection = 'DAOs';
  static NFTLimitsSection = 'NFTs';
  static DAOCoinLimitOrderLimitSection = 'DAO Coin Limit Orders';
  static AssociationSection = 'Associations';
  static AccessGroupSection = 'Access Groups';
  static AccessGroupMemberSection = 'Access Group Members';
  static StakeSection = 'Stake';
  static UnstakeSection = 'Unstake';
  static UnlockStakeSection = 'Unlock Stake';
  static LockupSection = 'Lockup';

  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;

  constructor(
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {
    const publicKeysToFetch = [
      ...new Set<string>(
        this.getPublicKeysFromCoinOperationLimitMap(
          this.transactionSpendingLimitResponse?.CreatorCoinOperationLimitMap
        ).concat(
          this.getPublicKeysFromCoinOperationLimitMap(
            this.transactionSpendingLimitResponse?.DAOCoinOperationLimitMap
          ),
          this.getPublicKeysFromDAOCoinLimitOrderLimitMap(
            this.transactionSpendingLimitResponse?.DAOCoinLimitOrderLimitMap
          ),
          this.getPublicKeysFromAssociationLimitMap(
            this.transactionSpendingLimitResponse?.AssociationLimitMap
          ),
          this.getPublicKeysFromAccessGroupLimitMap(
            this.transactionSpendingLimitResponse?.AccessGroupLimitMap
          ),
          this.getPublicKeysFromAccessGroupLimitMap(
            this.transactionSpendingLimitResponse?.AccessGroupMemberLimitMap
          ),
          this.getPublicKeysFromStakeLimitMap(
            this.transactionSpendingLimitResponse?.StakeLimitMap
          ),
          this.getPublicKeysFromStakeLimitMap(
            this.transactionSpendingLimitResponse?.UnstakeLimitMap
          ),
          this.getPublicKeysFromStakeLimitMap(
            this.transactionSpendingLimitResponse?.UnlockStakeLimitMap
          ),
          this.getPublicKeysFromLockupLimitMap(
            this.transactionSpendingLimitResponse?.LockupLimitMap
          )
        )
      ),
    ];

    this.backendApi
      .GetUsersStateless(publicKeysToFetch, true)
      .subscribe((res) => {
        res.UserList.map((user) => {
          this.userMap[user.PublicKeyBase58Check] = user;
        });
      });
  }

  getPublicKeysFromCoinOperationLimitMap(
    coinOpLimitMap: CoinOperationLimitMap<CoinLimitOperationString> | undefined
  ): string[] {
    return coinOpLimitMap ? Object.keys(coinOpLimitMap) : [];
  }

  getPublicKeysFromDAOCoinLimitOrderLimitMap(
    daoCoinLimitOrderLimitMap: DAOCoinLimitOrderLimitMap | undefined
  ): string[] {
    if (!daoCoinLimitOrderLimitMap) {
      return [];
    }
    let buyingPublicKeys = Object.keys(daoCoinLimitOrderLimitMap);
    let allKeysSet = new Set<string>(buyingPublicKeys);
    for (const buyingPublicKey of buyingPublicKeys) {
      for (const sellingPublicKey of Object.keys(
        daoCoinLimitOrderLimitMap[buyingPublicKey]
      )) {
        allKeysSet.add(sellingPublicKey);
      }
    }
    return Array.from(allKeysSet);
  }

  getPublicKeysFromAssociationLimitMap(
    associationLimitMap: AssociationLimitMapItem[] | undefined
  ): string[] {
    if (!associationLimitMap) {
      return [];
    }

    let allPublicKeys = new Set<string>();
    associationLimitMap.forEach((item) =>
      allPublicKeys.add(item.AppPublicKeyBase58Check)
    );
    return Array.from(allPublicKeys);
  }

  getPublicKeysFromAccessGroupLimitMap(
    accessGroupLimitMap:
      | AccessGroupLimitMapItem[]
      | AccessGroupMemberLimitMapItem[]
      | undefined
  ): string[] {
    if (!accessGroupLimitMap) {
      return [];
    }
    let allPublicKeys = new Set<string>();
    accessGroupLimitMap.forEach(
      (item: AccessGroupLimitMapItem | AccessGroupMemberLimitMapItem) =>
        allPublicKeys.add(item.AccessGroupOwnerPublicKeyBase58Check)
    );
    return Array.from(allPublicKeys);
  }

  getPublicKeysFromStakeLimitMap(
    stakeLimitMap:
      | StakeLimitMapItem[]
      | UnstakeLimitMapItem[]
      | UnlockStakeLimitMapItem[]
      | undefined
  ): string[] {
    if (!stakeLimitMap) {
      return [];
    }
    let allPublicKeys = new Set<string>();
    stakeLimitMap.forEach(
      (
        item: StakeLimitMapItem | UnstakeLimitMapItem | UnlockStakeLimitMapItem
      ) => allPublicKeys.add(item.ValidatorPublicKeyBase58Check)
    );
    return Array.from(allPublicKeys);
  }

  getPublicKeysFromLockupLimitMap(
    lockupLimitMap: LockupLimitMapItem[] | undefined
  ): string[] {
    if (!lockupLimitMap) {
      return [];
    }
    let allPublicKeys = new Set<string>();
    lockupLimitMap.forEach((item: LockupLimitMapItem) =>
      allPublicKeys.add(item.ProfilePublicKeyBase58Check)
    );
    return Array.from(allPublicKeys);
  }

  async onApproveClickWrapper() {
    this.isPendingApprove = true;
    await this.onApproveClick().finally(() => (this.isPendingApprove = false));
  }
}

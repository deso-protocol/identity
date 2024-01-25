import { Component, Input, OnInit } from '@angular/core';
import {
  AccessGroupLimitMapItem,
  AccessGroupMemberLimitMapItem,
  AssociationLimitMapItem,
  CreatorCoinLimitOperationString,
  CreatorCoinOperationLimitMap,
  DAOCoinLimitOperationString,
  DAOCoinLimitOrderLimitItem,
  DAOCoinLimitOrderLimitMap,
  DAOCoinOperationLimitMap,
  LockupLimitMapItem,
  LockupLimitOperationString,
  LockupLimitScopeType,
  NFTLimitOperationString,
  NFTOperationLimitMap,
  OperationToCountMap,
  StakeLimitMapItem,
  UnlockStakeLimitMapItem,
  UnstakeLimitMapItem,
  User,
} from '../../backend-api.service';
import { GlobalVarsService } from '../../global-vars.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-section',
  templateUrl: './transaction-spending-limit-section.component.html',
  styleUrls: ['./transaction-spending-limit-section.component.scss'],
})
export class TransactionSpendingLimitSectionComponent implements OnInit {
  @Input() sectionMap:
    | { [k: string]: number }
    | CreatorCoinOperationLimitMap
    | DAOCoinOperationLimitMap
    | NFTOperationLimitMap
    | DAOCoinLimitOrderLimitMap
    | AssociationLimitMapItem[]
    | AccessGroupLimitMapItem[]
    | AccessGroupMemberLimitMapItem[]
    | StakeLimitMapItem[]
    | UnstakeLimitMapItem[]
    | UnlockStakeLimitMapItem[]
    | LockupLimitMapItem[] = {};
  @Input() sectionTitle: string = '';

  @Input() userMap: { [k: string]: User } = {};
  showDetails: boolean = false;
  showAll: boolean = false;
  defaultNumShown: number = 5;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;
  anyCreatorItem:
    | OperationToCountMap<CreatorCoinLimitOperationString>
    | OperationToCountMap<DAOCoinLimitOperationString>
    | undefined;
  anyNFTItem: OperationToCountMap<NFTLimitOperationString> | undefined;
  anyLockupLimitItems: LockupLimitMapItem[] = [];
  anyValidatorItem:
    | StakeLimitMapItem
    | UnstakeLimitMapItem
    | UnlockStakeLimitMapItem
    | undefined;

  coinLimitMap: CreatorCoinOperationLimitMap | DAOCoinOperationLimitMap = {};
  txnLimitMap: { [k: string]: number } = {};
  nftLimitMap: NFTOperationLimitMap = {};
  daoCoinLimitOrderLimitMap: DAOCoinLimitOrderLimitMap = {};
  daoCoinLimitOrderLimitItems: DAOCoinLimitOrderLimitItem[] = [];
  associationLimitMap: AssociationLimitMapItem[] = [];
  accessGroupLimitMap: AccessGroupLimitMapItem[] = [];
  accessGroupMemberLimitMap: AccessGroupMemberLimitMapItem[] = [];
  stakeLimitMap: StakeLimitMapItem[] = [];
  unstakeLimitMap: UnstakeLimitMapItem[] = [];
  unlockStakeLimitMap: UnlockStakeLimitMapItem[] = [];
  lockupLimitMap: LockupLimitMapItem[] = [];

  constructor(public globalVars: GlobalVarsService) {}

  ngOnInit(): void {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.TransactionLimitsSection:
        this.txnLimitMap = this.sectionMap as { [k: string]: number };
        break;
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        this.anyCreatorItem = (
          this.sectionMap as
            | DAOCoinOperationLimitMap
            | CreatorCoinOperationLimitMap
        )[''] as
          | OperationToCountMap<CreatorCoinLimitOperationString>
          | OperationToCountMap<DAOCoinLimitOperationString>
          | undefined;
        this.coinLimitMap = { ...this.sectionMap } as
          | CreatorCoinOperationLimitMap
          | DAOCoinOperationLimitMap;
        delete this.coinLimitMap[''];
        break;
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        this.anyNFTItem = (this.sectionMap as NFTOperationLimitMap)[''] as
          | OperationToCountMap<NFTLimitOperationString>
          | undefined;
        this.nftLimitMap = { ...this.sectionMap } as NFTOperationLimitMap;
        delete this.nftLimitMap[''];
        break;
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        this.daoCoinLimitOrderLimitMap = this
          .sectionMap as DAOCoinLimitOrderLimitMap;
        for (const buyingPublicKey of Object.keys(
          this.daoCoinLimitOrderLimitMap
        )) {
          const sellingPublicKeys = Object.keys(
            this.daoCoinLimitOrderLimitMap[buyingPublicKey]
          );
          sellingPublicKeys.map((sellingPublicKey) => {
            this.daoCoinLimitOrderLimitItems.push({
              BuyingPublicKey: buyingPublicKey,
              SellingPublicKey: sellingPublicKey,
              OpCount:
                this.daoCoinLimitOrderLimitMap[buyingPublicKey][
                  sellingPublicKey
                ],
            });
          });
        }
        break;
      case TransactionSpendingLimitComponent.AssociationSection:
        this.associationLimitMap = this.sectionMap as AssociationLimitMapItem[];
        break;
      case TransactionSpendingLimitComponent.AccessGroupSection:
        this.accessGroupLimitMap = this.sectionMap as AccessGroupLimitMapItem[];
        break;
      case TransactionSpendingLimitComponent.AccessGroupMemberSection:
        this.accessGroupMemberLimitMap = this
          .sectionMap as AccessGroupMemberLimitMapItem[];
        break;
      case TransactionSpendingLimitComponent.StakeSection:
        this.stakeLimitMap = this.sectionMap as StakeLimitMapItem[];
        this.anyValidatorItem = this.stakeLimitMap.find(
          (item) => item.ValidatorPublicKeyBase58Check === ''
        );
        this.stakeLimitMap = this.stakeLimitMap.filter(
          (item) => item.ValidatorPublicKeyBase58Check !== ''
        );
        break;
      case TransactionSpendingLimitComponent.UnstakeSection:
        this.unstakeLimitMap = this.sectionMap as UnstakeLimitMapItem[];
        this.anyValidatorItem = this.unstakeLimitMap.find(
          (item) => item.ValidatorPublicKeyBase58Check === ''
        );
        this.unstakeLimitMap = this.unstakeLimitMap.filter(
          (item) => item.ValidatorPublicKeyBase58Check !== ''
        );
        break;
      case TransactionSpendingLimitComponent.UnlockStakeSection:
        this.unlockStakeLimitMap = this.sectionMap as UnlockStakeLimitMapItem[];
        this.anyValidatorItem = this.unlockStakeLimitMap.find(
          (item) => item.ValidatorPublicKeyBase58Check === ''
        );
        this.unlockStakeLimitMap = this.unlockStakeLimitMap.filter(
          (item) => item.ValidatorPublicKeyBase58Check !== ''
        );
        break;
      case TransactionSpendingLimitComponent.LockupSection:
        this.lockupLimitMap = this.sectionMap as LockupLimitMapItem[];
        this.anyLockupLimitItems = this.lockupLimitMap.filter(
          (item) =>
            item.ProfilePublicKeyBase58Check === '' &&
            item.ScopeType === LockupLimitScopeType.ANY
        );
        this.lockupLimitMap = this.lockupLimitMap.filter(
          (item) =>
            item.ProfilePublicKeyBase58Check !== '' ||
            item.ScopeType !== LockupLimitScopeType.ANY
        );
        break;
    }

    this.showAll = this.getSectionMapLength() <= this.defaultNumShown;
  }

  sectionItemType(): string {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.TransactionLimitsSection:
        return 'transaction type';
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
        return 'creator coin';
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        return 'DAO coin';
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        return 'NFT';
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        return 'DAO coin limit order';
      case TransactionSpendingLimitComponent.AssociationSection:
        return 'Association';
      case TransactionSpendingLimitComponent.AccessGroupSection:
        return 'Access Group';
      case TransactionSpendingLimitComponent.AccessGroupMemberSection:
        return 'Access Group Member';
      case TransactionSpendingLimitComponent.StakeSection:
      case TransactionSpendingLimitComponent.UnstakeSection:
      case TransactionSpendingLimitComponent.UnlockStakeSection:
        return 'Validator';
      case TransactionSpendingLimitComponent.LockupSection:
        return 'Lockup';
      default:
        return '';
    }
  }

  hasAnyCreatorOrNFT(): boolean {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        return !!this.anyCreatorItem;
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        return !!this.anyNFTItem;
      case TransactionSpendingLimitComponent.StakeSection:
      case TransactionSpendingLimitComponent.UnstakeSection:
      case TransactionSpendingLimitComponent.UnlockStakeSection:
        return !!this.anyValidatorItem;
      case TransactionSpendingLimitComponent.LockupSection:
        return !!this.anyLockupLimitItems.length;
    }
    return false;
  }

  sectionSummary(): string {
    let operationsStr = 'operations on ';
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.TransactionLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        operationsStr = '';
        break;
      case TransactionSpendingLimitComponent.StakeSection:
        operationsStr = 'stake operations on ';
        break;
      case TransactionSpendingLimitComponent.UnstakeSection:
        operationsStr = 'unstake operations on ';
        break;
      case TransactionSpendingLimitComponent.UnlockStakeSection:
        operationsStr = 'unlock stake operations on ';
        break;
    }
    const keyLen = this.getSectionMapLength();
    const sectionItemType = this.sectionItemType();
    return `This app can execute the following ${operationsStr}${keyLen} specific ${sectionItemType}${
      keyLen > 1 ? 's' : ''
    } ${
      this.hasAnyCreatorOrNFT()
        ? ` as well as operations on all ${sectionItemType}s`
        : ''
    }`;
  }

  getSectionMapLength(): number {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        return this.daoCoinLimitOrderLimitItems.length;
      case TransactionSpendingLimitComponent.AssociationSection:
        return this.associationLimitMap.length;
      case TransactionSpendingLimitComponent.AccessGroupSection:
        return this.accessGroupLimitMap.length;
      case TransactionSpendingLimitComponent.AccessGroupMemberSection:
        return this.accessGroupMemberLimitMap.length;
      case TransactionSpendingLimitComponent.StakeSection:
        return this.stakeLimitMap.length;
      case TransactionSpendingLimitComponent.UnstakeSection:
        return this.unstakeLimitMap.length;
      case TransactionSpendingLimitComponent.UnlockStakeSection:
        return this.unlockStakeLimitMap.length;
      case TransactionSpendingLimitComponent.LockupSection:
        return this.lockupLimitMap.length;
      default:
        return this.globalVars.ObjectKeyLength(this.sectionMap);
    }
  }
}

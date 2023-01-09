import { Component, Input, OnInit } from '@angular/core';
import {
  AssociationClass,
  AssociationLimitMapItem,
  CreatorCoinLimitOperationString,
  CreatorCoinOperationLimitMap,
  DAOCoinLimitOperationString,
  DAOCoinLimitOrderLimitItem,
  DAOCoinLimitOrderLimitMap,
  DAOCoinOperationLimitMap,
  NFTLimitOperationString,
  NFTOperationLimitMap,
  OperationToCountMap,
  User
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
    | AssociationLimitMapItem[] = {};
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

  coinLimitMap: CreatorCoinOperationLimitMap | DAOCoinOperationLimitMap = {};
  txnLimitMap: { [k: string]: number } = {};
  nftLimitMap: NFTOperationLimitMap = {};
  daoCoinLimitOrderLimitMap: DAOCoinLimitOrderLimitMap = {};
  daoCoinLimitOrderLimitItems: DAOCoinLimitOrderLimitItem[] = [];
  associationLimitMap: AssociationLimitMapItem[] = [];
  // TODO: define these for associations
  userAssociationItems: any[] = [];
  postAssociationItems: any[] = [];

  constructor(public globalVars: GlobalVarsService) {}

  ngOnInit(): void {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.TransactionLimitsSection:
        this.txnLimitMap = this.sectionMap as { [k: string]: number };
        break;
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        this.anyCreatorItem = (this.sectionMap as DAOCoinOperationLimitMap | CreatorCoinOperationLimitMap)[''] as
          | OperationToCountMap<CreatorCoinLimitOperationString>
          | OperationToCountMap<DAOCoinLimitOperationString>
          | undefined;
        this.coinLimitMap = {...this.sectionMap} as
          | CreatorCoinOperationLimitMap
          | DAOCoinOperationLimitMap;
        delete this.coinLimitMap[''];
        break;
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        this.anyNFTItem = (this.sectionMap as NFTOperationLimitMap)[''] as
          | OperationToCountMap<NFTLimitOperationString>
          | undefined;
        this.nftLimitMap = {...this.sectionMap} as NFTOperationLimitMap;
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
        this.userAssociationItems = this.associationLimitMap.filter((item) => item.AssociationClass === AssociationClass.USER);
        this.postAssociationItems = this.userAssociationItems.filter((item) => item.AssociationClass === AssociationClass.POST);
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
      default:
        return '';
    }
  }

  // TODO: update for Associations
  hasAnyCreatorOrNFT(): boolean {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        return !!this.anyCreatorItem;
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        return !!this.anyNFTItem;
      // case TransactionSpendingLimitComponent.AssociationSection:
      //   return !!this.anyCreatorItem;
    }
    return false;
  }

  // TODO: update for Associations
  sectionSummary(): string {
    const operationsStr =
      this.sectionTitle !==
        TransactionSpendingLimitComponent.TransactionLimitsSection &&
      this.sectionTitle !==
        TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection
        ? 'operations on '
        : '';
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

  // TODO: update for Associations
  getSectionMapLength(): number {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        return this.daoCoinLimitOrderLimitItems.length;
      case TransactionSpendingLimitComponent.AssociationSection:
        return this.associationLimitMap.length;
      default:
        return this.globalVars.ObjectKeyLength(this.sectionMap);
    }
  }
}

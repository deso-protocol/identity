import { Component, Input, OnInit } from '@angular/core';
import { CreatorCoinLimitOperationString,
  CreatorCoinOperationLimitMap,
  DAOCoinLimitOperationString,
  DAOCoinLimitOrderLimitItem,
  DAOCoinLimitOrderLimitMap,
  DAOCoinOperationLimitMap,
  NFTLimitOperationString,
  NFTOperationLimitMap, OperationToCountMap, User } from '../../backend-api.service';
import { GlobalVarsService } from '../../global-vars.service';
import { TransactionSpendingLimitComponent } from '../transaction-spending-limit.component';

@Component({
  selector: 'app-transaction-spending-limit-section',
  templateUrl: './transaction-spending-limit-section.component.html',
  styleUrls: ['./transaction-spending-limit-section.component.scss']
})
export class TransactionSpendingLimitSectionComponent implements OnInit {

  @Input() sectionMap: { [k: string]: number } |
    CreatorCoinOperationLimitMap |
    DAOCoinOperationLimitMap |
    NFTOperationLimitMap |
    DAOCoinLimitOrderLimitMap = {};
  @Input() sectionTitle: string = "";

  @Input() userMap: { [k: string]: User } = {};
  showDetails: boolean = false;
  showAll: boolean = false;
  defaultNumShown: number = 5;
  TransactionSpendingLimitComponent = TransactionSpendingLimitComponent;
  anyCreatorItem:
    OperationToCountMap<CreatorCoinLimitOperationString> |
    OperationToCountMap<DAOCoinLimitOperationString> |
    undefined;
  anyNFTItem: OperationToCountMap<NFTLimitOperationString> | undefined;

  coinLimitMap: CreatorCoinOperationLimitMap | DAOCoinOperationLimitMap = {};
  txnLimitMap: { [k: string]: number} = {};
  nftLimitMap: NFTOperationLimitMap = {};
  daoCoinLimitOrderLimitMap: DAOCoinLimitOrderLimitMap = {};
  daoCoinLimitOrderLimitItems: DAOCoinLimitOrderLimitItem[] = [];

  constructor(
    public globalVars: GlobalVarsService,
  ) { }

  ngOnInit(): void {
    switch (this.sectionTitle) {
      case TransactionSpendingLimitComponent.TransactionLimitsSection:
        this.txnLimitMap = this.sectionMap as { [k: string]: number };
        break;
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        this.anyCreatorItem = this.sectionMap[""] as (
          OperationToCountMap<CreatorCoinLimitOperationString> |
          OperationToCountMap<DAOCoinLimitOperationString> |
          undefined);
        delete this.sectionMap[""];
        this.coinLimitMap = this.sectionMap as (CreatorCoinOperationLimitMap | DAOCoinOperationLimitMap);
        break;
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        this.anyNFTItem = this.sectionMap[""] as (OperationToCountMap<NFTLimitOperationString> | undefined);
        delete this.sectionMap[""];
        this.nftLimitMap = this.sectionMap as NFTOperationLimitMap;
        break;
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        this.daoCoinLimitOrderLimitMap = this.sectionMap as DAOCoinLimitOrderLimitMap;
        for (const buyingPublicKey of Object.keys(this.daoCoinLimitOrderLimitMap)) {
          const sellingPublicKeys = Object.keys(this.daoCoinLimitOrderLimitMap[buyingPublicKey]);
          sellingPublicKeys.map(
            (sellingPublicKey) => {
              this.daoCoinLimitOrderLimitItems.push({
                BuyingPublicKey: buyingPublicKey,
                SellingPublicKey: sellingPublicKey,
                OpCount: this.daoCoinLimitOrderLimitMap[buyingPublicKey][sellingPublicKey],
              });
            })
        }
        break;
    }

    this.showAll = this.getSectionMapLength() <= this.defaultNumShown;
  }

  sectionItemType(): string {
    switch(this.sectionTitle) {
      case TransactionSpendingLimitComponent.TransactionLimitsSection:
        return "transaction type";
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
        return "creator coin";
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        return "DAO coin"
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        return "NFT"
      case TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection:
        return "DAO coin limit order"
      default:
        return "";
    }
  }

  hasAnyCreatorOrNFT(): boolean {
    switch(this.sectionTitle) {
      case TransactionSpendingLimitComponent.CreatorCoinLimitsSection:
      case TransactionSpendingLimitComponent.DAOCoinLimitsSection:
        return !!this.anyCreatorItem;
      case TransactionSpendingLimitComponent.NFTLimitsSection:
        return !!this.anyNFTItem;
    }
    return false;
  }

  sectionSummary(): string {
    const operationsStr = this.sectionTitle !== TransactionSpendingLimitComponent.TransactionLimitsSection &&
    this.sectionTitle !== TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection ?
      "operations on " : "";
    const keyLen = this.getSectionMapLength();
    const sectionItemType = this.sectionItemType();
    return `This app can execute the following ${operationsStr}${
      keyLen
    } specific ${
      sectionItemType
    }${
      keyLen > 1 ? "s" : ""
    } ${
      this.hasAnyCreatorOrNFT() ? ` as well as operations on all ${sectionItemType}s` : ""
    }`;
  }

  getSectionMapLength(): number {
    return this.sectionTitle === TransactionSpendingLimitComponent.DAOCoinLimitOrderLimitSection ?
      this.daoCoinLimitOrderLimitItems.length : this.globalVars.ObjectKeyLength(this.sectionMap);
  }
}

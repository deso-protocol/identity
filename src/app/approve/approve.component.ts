import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CryptoService} from '../crypto.service';
import {IdentityService} from '../identity.service';
import {AccountService} from '../account.service';
import {GlobalVarsService} from '../global-vars.service';
import {SigningService} from '../signing.service';
import {BackendAPIService, ProfileEntryResponse, User} from '../backend-api.service';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {
  Transaction,
  TransactionMetadataBasicTransfer,
  TransactionMetadataBitcoinExchange,
  TransactionMetadataCreatorCoin,
  TransactionMetadataCreatorCoinTransfer,
  TransactionMetadataFollow,
  TransactionMetadataLike,
  TransactionMetadataPrivateMessage,
  TransactionMetadataSubmitPost,
  TransactionMetadataSwapIdentity,
  TransactionMetadataUpdateBitcoinUSDExchangeRate,
  TransactionMetadataUpdateGlobalParams,
  TransactionMetadataUpdateProfile,
  TransactionMetadataCreateNFT,
  TransactionMetadataUpdateNFT,
  TransactionMetadataNFTBid,
  TransactionMetadataAcceptNFTBid,
  TransactionMetadataNFTTransfer,
  TransactionMetadataAcceptNFTTransfer,
  TransactionMetadataBurnNFT,
  TransactionMetadataAuthorizeDerivedKey
} from '../../lib/deso/transaction';
import bs58check from 'bs58check';

@Component({
  selector: 'app-approve',
  templateUrl: './approve.component.html',
  styleUrls: ['./approve.component.scss']
})
export class ApproveComponent implements OnInit {
  transaction: any;
  publicKey: any;
  transactionHex: any;
  username: any;
  transactionDescription: any;
  transactionDeSoSpent: string | boolean = false;
  fetchingProfiles: boolean = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private cryptoService: CryptoService,
    private identityService: IdentityService,
    private accountService: AccountService,
    public globalVars: GlobalVarsService,
    private signingService: SigningService,
    private backendApi: BackendAPIService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.transactionHex = params.tx;
      this.backendApi.GetTransactionSpending(this.transactionHex).subscribe( res => {
        this.transactionDeSoSpent = res ? this.nanosToUnitString(res) : false;
      });
      const txBytes = new Buffer(this.transactionHex, 'hex');
      this.transaction = Transaction.fromBytes(txBytes)[0];
      this.publicKey = this.base58KeyCheck(this.transaction.publicKey);

      this.generateTransactionDescription();
    });
  }

  onCancel(): void {
    this.finishFlow();
  }

  onSubmit(): void {
    const signedTransactionHex = this.signingService.signTransaction(this.seedHex(), this.transactionHex);
    this.finishFlow(signedTransactionHex);
  }

  finishFlow(signedTransactionHex?: string): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      signedTransactionHex,
    });
  }

  seedHex(): string {
    const encryptedSeedHex = this.accountService.getEncryptedUsers()[this.publicKey].encryptedSeedHex;
    return this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
  }

  generateTransactionDescription(): void {
    let description = 'sign an unknown transaction';

    switch (this.transaction.metadata.constructor) {
      case TransactionMetadataBasicTransfer:
        const outputs: any[] = [];
        const publicKeys = this.transaction.outputs.map((output: any) => output.publicKey);
        this.getProfilesForPublicKeys(publicKeys).subscribe((userMap) => {
          // for if sender and recipient are same account
          let sendingToSelf = true;

          for (const output of this.transaction.outputs) {
            // Skip the change output. 0 means the buffers are equal
            if (Buffer.compare(output.publicKey, this.transaction.publicKey) !== 0) {
              sendingToSelf = false;
              const sendKey = this.base58KeyCheck(output.publicKey);
              const sendDisplayName = this.getNameOrPublicKey(userMap[sendKey]?.ProfileEntryResponse?.Username, sendKey);
              const sendAmount = this.nanosToUnitString(output.amountNanos);
              outputs.push(`${sendAmount} $DESO to ${sendDisplayName}`);
            }
          }

          // if all recipients are same as this.transaction.publicKey (outputs is empty)
          if (sendingToSelf && this.transaction.outputs.length > 0) {
            const publicKey = this.transaction.publicKey;
            const displayName = this.getNameOrPublicKey(userMap[publicKey]?.ProfileEntryResponse?.Username, publicKey);
            outputs.push(`$DESO to ${displayName}`);
          }

          description = `send ${outputs.join(', ')}`;
          this.transactionDescription = description;
          this.fetchingProfiles = false;
        });


        break;

      case TransactionMetadataBitcoinExchange:
        description = 'exchange bitcoin';
        break;

      case TransactionMetadataPrivateMessage:
        description = 'send a private message';
        break;

      case TransactionMetadataSubmitPost:
        description = 'submit a post';
        break;

      case TransactionMetadataUpdateProfile:
        description = 'update your profile';
        break;

      case TransactionMetadataUpdateBitcoinUSDExchangeRate:
        description = 'update bitcoin exchange rate';
        break;

      case TransactionMetadataFollow:
        const followedKey = this.base58KeyCheck(this.transaction.metadata.followedPublicKey);
        this.getUsernameForPublicKey(followedKey).subscribe((username) => {
          description = `follow ${this.getNameOrPublicKey(username, followedKey)}`;
          this.transactionDescription = description;
          this.fetchingProfiles = false;
        });
        break;

      case TransactionMetadataLike:
        if (this.transaction.metadata.isUnlike) {
          description = 'unlike a post';
        } else {
          description = 'like a post';
        }
        break;

      case TransactionMetadataCreatorCoin:
        const creatorKey = this.base58KeyCheck(this.transaction.metadata.profilePublicKey);
        const desoToSell = this.nanosToUnitString(this.transaction.metadata.desoToSellNanos);
        const creatorCoinToSell = this.nanosToUnitString(this.transaction.metadata.creatorCoinToSellNanos);
        const desoToAdd = this.nanosToUnitString(this.transaction.metadata.desoToAddNanos);
        this.getUsernameForPublicKey(creatorKey).subscribe((username) => {
          const displayName = this.getNameOrPublicKey(username, creatorKey);
          if (this.transaction.metadata.operationType === 0) {
            description = `spend ${desoToSell} $DESO to buy the creator coin of ${displayName}`;
          } else if (this.transaction.metadata.operationType === 1) {
            description = `sell ${creatorCoinToSell} creator coins of ${displayName} `;
          } else if (this.transaction.metadata.operationType === 2) {
            description = `add ${displayName} creator coin for ${desoToAdd} $DESO`;
          }
          this.transactionDescription = description;
          this.fetchingProfiles = false;
        });
        break;

      case TransactionMetadataSwapIdentity:
        description = 'swap identities';
        break;

      case TransactionMetadataUpdateGlobalParams:
        description = 'update global params';
        break;

      case TransactionMetadataCreatorCoinTransfer:
        const creatorPublicKey = this.base58KeyCheck(this.transaction.metadata.profilePublicKey);
        this.getUsernameForPublicKey(creatorPublicKey).subscribe((username) => {
          const transferAmount = this.nanosToUnitString(this.transaction.metadata.creatorCoinToTransferNanos);
          description = `transfer ${transferAmount} creator coin of ${this.getNameOrPublicKey(username, creatorPublicKey)}`;
          this.transactionDescription = description;
          this.fetchingProfiles = false;
        });
        break;

      case TransactionMetadataCreateNFT:
        description = 'create an NFT';
        break;

      case TransactionMetadataUpdateNFT:
        description = 'update an NFT';
        break;

      case TransactionMetadataNFTBid:
        description = 'bid on an NFT';
        break;

      case TransactionMetadataAcceptNFTBid:
        description = 'accept a bid on an NFT';
        break;

      case TransactionMetadataNFTTransfer:
        description = 'transfer an NFT';
        break;

      case TransactionMetadataAcceptNFTTransfer:
        description = 'accept an NFT transfer';
        break;

      case TransactionMetadataBurnNFT:
        description = 'burn an NFT';
        break;

      case TransactionMetadataAuthorizeDerivedKey:
        if (this.transaction.metadata.operationType === 0){
          description = 'de-authorize a derived key';
        }  else if (this.transaction.metadata.operationType === 1){
          description = 'authorize a derived key';
        }
        break;
    }

    this.transactionDescription = description;
  }

  keyName(publicKey: string): string {
    return publicKey;
  }

  base58KeyCheck(keyBytes: Uint8Array): string {
    const prefix = CryptoService.PUBLIC_KEY_PREFIXES[this.globalVars.network].deso;
    return bs58check.encode(Buffer.from([...prefix, ...keyBytes]));
  }

  nanosToUnitString(nanos: number): string {
    // Change nanos into a formatted string of units. This combination of toFixed and regex removes trailing zeros.
    // If we do a regular toString(), some numbers can be represented in E notation which doesn't look as good.
    return (nanos / 1e9).toFixed(9).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/,'$1');
  }

  // Fetch a single ProfileEntryResponse
  getUsernameForPublicKey(publicKey: string): Observable<string | null | undefined> {
    this.fetchingProfiles = true;
    return this.backendApi.GetUsersStateless([publicKey], true).pipe(map(res => {
      const userList = res.UserList
      if (userList.length === 0) {
        return null;
      }
      const user = userList[0];
      return user?.ProfileEntryResponse?.Username;
    }));
  }

  // Fetch multiple User objects
  getProfilesForPublicKeys(publicKeys: string[]): Observable<{ [k: string]: User}> {
    this.fetchingProfiles = true;
    return this.backendApi.GetUsersStateless(publicKeys, true).pipe(map(res => {
      const userList = res.UserList
      if (userList.length === 0) {
        return {};
      }
      return userList.reduce((userMap: { [k: string]: User}, user: User) => {
        userMap[user.PublicKeyBase58Check] = user;
        return userMap;
      }, {})
      return userList.map((user: { ProfileEntryResponse: ProfileEntryResponse, PublicKeyBase58Check: string }) => user?.ProfileEntryResponse)
    }));
  }

  // Returns username if truthy, otherwise public key
  getNameOrPublicKey(username: string | null | undefined, publicKey: string): string {
    return username || publicKey;
  }
}

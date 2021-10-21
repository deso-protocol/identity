import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CryptoService} from '../crypto.service';
import {IdentityService} from '../identity.service';
import {AccountService} from '../account.service';
import {GlobalVarsService} from '../global-vars.service';
import {SigningService} from '../signing.service';
import {BackendAPIService, ProfileEntryResponse, User} from '../backend-api.service';
import {Observable, of} from 'rxjs';
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
  loading: boolean = true;

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

      this.generateTransactionDescription()
        .subscribe((description) => this.transactionDescription = description)
        .add(() => this.loading = false);
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

  generateTransactionDescription(): Observable<string> {
    const unknownTransaction = 'sign an unknown transaction';

    switch (this.transaction.metadata.constructor) {
      case TransactionMetadataBasicTransfer:
        const outputs: any[] = [];
        const publicKeys = this.transaction.outputs.map((output: { publicKey: Uint8Array }) => output.publicKey);
        return this.getDisplayNamesForPublicKeys(publicKeys).pipe(map((displayNameMap) => {
          // for if sender and recipient are same account
          let sendingToSelf = true;

          for (const output of this.transaction.outputs) {
            // Skip the change output. 0 means the buffers are equal
            if (Buffer.compare(output.publicKey, this.transaction.publicKey) !== 0) {
              sendingToSelf = false;
              const sendKey = this.base58KeyCheck(output.publicKey);
              const sendDisplayName = this.getNameOrPublicKey(displayNameMap[sendKey], sendKey);
              const sendAmount = this.nanosToUnitString(output.amountNanos);
              outputs.push(`${sendAmount} $DESO to ${sendDisplayName}`);
            }
          }

          // if all recipients are same as this.transaction.publicKey (outputs is empty)
          if (sendingToSelf && this.transaction.outputs.length > 0) {
            const publicKey = this.transaction.publicKey;
            const displayName = this.getNameOrPublicKey(displayNameMap[publicKey], publicKey);
            outputs.push(`$DESO to ${displayName}`);
          }

          return `send ${outputs.join(', ')}`;
        }));

      case TransactionMetadataBitcoinExchange:
        return of('exchange bitcoin');

      case TransactionMetadataPrivateMessage:
        return of('send a private message');

      case TransactionMetadataSubmitPost:
        return of('submit a post');

      case TransactionMetadataUpdateProfile:
        return of('update your profile');

      case TransactionMetadataUpdateBitcoinUSDExchangeRate:
        return of('update bitcoin exchange rate');

      case TransactionMetadataFollow:
        const followAction = this.transaction.metadata.isUnfollow ? "unfollow" : "follow";
        return this.getDisplayNameForPublicKey(this.transaction.metadata.followedPublicKey)
          .pipe(
            map((displayName) => `${followAction} ${displayName}`
        ));

      case TransactionMetadataLike:
        return of(this.transaction.metadata.isUnlike ? 'unlike a post' : 'like a post');

      case TransactionMetadataCreatorCoin:
        return this.getDisplayNameForPublicKey(this.transaction.metadata.profilePublicKey).pipe(map((displayName) => {
          if (this.transaction.metadata.operationType === 0) {
            const desoToSell = this.nanosToUnitString(this.transaction.metadata.desoToSellNanos);
            return `spend ${desoToSell} $DESO to buy the creator coin of ${displayName}`;
          } else if (this.transaction.metadata.operationType === 1) {
            const creatorCoinToSell = this.nanosToUnitString(this.transaction.metadata.creatorCoinToSellNanos);
            return `sell ${creatorCoinToSell} creator coins of ${displayName} `;
          } else if (this.transaction.metadata.operationType === 2) {
            const desoToAdd = this.nanosToUnitString(this.transaction.metadata.desoToAddNanos);
            return `add ${displayName} creator coin for ${desoToAdd} $DESO`;
          }
          return unknownTransaction;
        }));

      case TransactionMetadataSwapIdentity:
        return of('swap identities');

      case TransactionMetadataUpdateGlobalParams:
        return of('update global params');

      case TransactionMetadataCreatorCoinTransfer:
        const transferAmount = this.nanosToUnitString(this.transaction.metadata.creatorCoinToTransferNanos);
        return this.getDisplayNameForPublicKey(this.transaction.metadata.profilePublicKey)
          .pipe(
            map((displayName) => `transfer ${transferAmount} creator coin of ${displayName}`
        ));

      case TransactionMetadataCreateNFT:
        return of('create an NFT');

      case TransactionMetadataUpdateNFT:
        return of('update an NFT');

      case TransactionMetadataNFTBid:
        return of('bid on an NFT');

      case TransactionMetadataAcceptNFTBid:
        return of('accept a bid on an NFT');

      case TransactionMetadataNFTTransfer:
        return of('transfer an NFT');

      case TransactionMetadataAcceptNFTTransfer:
        return of('accept an NFT transfer');

      case TransactionMetadataBurnNFT:
        return of('burn an NFT');

      case TransactionMetadataAuthorizeDerivedKey:
        if (this.transaction.metadata.operationType === 0){
          return of('de-authorize a derived key');
        }  else if (this.transaction.metadata.operationType === 1){
          return of('authorize a derived key');
        }
        return of(unknownTransaction)
      default:
        return of(unknownTransaction)
    }

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

  // Fetch a single display name given a public key.  If a public key has a Profile, then this return a username. If not, it returns a public key.
  getDisplayNameForPublicKey(publicKey: Uint8Array): Observable<string> {
    return this.backendApi.GetUsersStateless([this.base58KeyCheck(publicKey)], true).pipe(map(res => {
      const userList = res.UserList
      if (userList.length === 0) {
        return null;
      }
      const user = userList[0];
      return user?.ProfileEntryResponse?.Username || publicKey;
    }));
  }

  // Fetch a map of public key to display name.
  getDisplayNamesForPublicKeys(publicKeys: Uint8Array[]): Observable<{ [k: string]: string}> {
    return this.backendApi.GetUsersStateless(publicKeys.map((publicKey) => this.base58KeyCheck(publicKey)), true)
      .pipe(map(res => {
        const userList = res.UserList;
        if (userList.length === 0) {
          return {};
        }
        return userList.reduce((userMap: { [k: string]: string}, user: User) => {
          userMap[user.PublicKeyBase58Check] = user?.ProfileEntryResponse?.Username || user.PublicKeyBase58Check;
          return userMap;
        }, {});
      }));
  }

  // Returns username if truthy, otherwise public key
  getNameOrPublicKey(username: string | null | undefined, publicKey: string): string {
    return username || publicKey;
  }
}

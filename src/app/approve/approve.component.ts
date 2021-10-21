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
        .subscribe((description) => this.transactionDescription = description);
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
  console.log(this.transaction);
    switch (this.transaction.metadata.constructor) {
      case TransactionMetadataBasicTransfer:
        const outputs: any[] = [];
        const publicKeys = this.transaction.outputs.map((output: { publicKey: Uint8Array }) => output.publicKey);
        let sendingToSelf = true;

        for (const output of this.transaction.outputs) {
          // Skip the change output. 0 means the buffers are equal
          if (Buffer.compare(output.publicKey, this.transaction.publicKey) !== 0) {
            sendingToSelf = false;
            const sendKey = this.base58KeyCheck(output.publicKey);
            const sendAmount = this.nanosToUnitString(output.amountNanos);
            outputs.push(`${sendAmount} $DESO to ${sendKey}`);
          }
        }

        // if all recipients are same as this.transaction.publicKey (outputs is empty)
        if (sendingToSelf && this.transaction.outputs.length > 0) {
          const publicKey = this.base58KeyCheck(this.transaction.publicKey);
          publicKeys.push(this.transaction.publicKey);
          outputs.push(`$DESO to ${publicKey}`);
        }

        const descriptionString = `send ${outputs.join(', ')}`;
        return this.getDescriptionForPublicKeys(publicKeys, descriptionString);

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
        const followedPublicKey = this.transaction.metadata.followedPublicKey;
        return this.getDescriptionForPublicKey(followedPublicKey, `${followAction} ${this.base58KeyCheck(followedPublicKey)}`);

      case TransactionMetadataLike:
        return of(this.transaction.metadata.isUnlike ? 'unlike a post' : 'like a post');

      case TransactionMetadataCreatorCoin:
          const operationType = this.transaction.metadata.operationType;
          const publicKey = this.transaction.metadata.profilePublicKey;
          if (operationType === 0) {
          const desoToSell = this.nanosToUnitString(this.transaction.metadata.desoToSellNanos);
          return this.getDescriptionForPublicKey(publicKey, `spend ${desoToSell} $DESO to buy the creator coin of ${this.base58KeyCheck(publicKey)}`);
        } else if (operationType === 1) {
          const creatorCoinToSell = this.nanosToUnitString(this.transaction.metadata.creatorCoinToSellNanos);
          return this.getDescriptionForPublicKey(publicKey, `sell ${creatorCoinToSell} creator coins of ${this.base58KeyCheck(publicKey)} `);
        } else if (this.transaction.metadata.operationType === 2) {
          const desoToAdd = this.nanosToUnitString(this.transaction.metadata.desoToAddNanos);
          return this.getDescriptionForPublicKey(publicKey, `add ${this.base58KeyCheck(publicKey)} creator coin for ${desoToAdd} $DESO`);
        }
        return of(unknownTransaction);

      case TransactionMetadataSwapIdentity:
        return of('swap identities');

      case TransactionMetadataUpdateGlobalParams:
        return of('update global params');

      case TransactionMetadataCreatorCoinTransfer:
        const transferAmount = this.nanosToUnitString(this.transaction.metadata.creatorCoinToTransferNanos);
        const profilePublicKey = this.transaction.metadata.profilePublicKey;
        return this.getDescriptionForPublicKey(profilePublicKey, `transfer ${transferAmount} creator coin of ${this.base58KeyCheck(profilePublicKey)}`);

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

  // Fetch username and replace in description string if available.
  getDescriptionForPublicKey(publicKey: Uint8Array, descriptionString: string): Observable<string> {
    return this.getDescriptionForPublicKeys([publicKey], descriptionString);
  }

  // Get profile entries for all public keys and then replace public keys in description string with username.
  getDescriptionForPublicKeys(publicKeys: Uint8Array[], descriptionString: string): Observable<string> {
    // Set transactionDescrpition to the descriptionString (which is already has public keys, not placeholders) prior
    // to fetching the profiles from the API so user immediately sees what transaction they are approving.
    this.transactionDescription = descriptionString;
    return this.backendApi.GetUsersStateless(publicKeys.map((publicKey) => this.base58KeyCheck(publicKey)), true)
      .pipe(map(res => {
        const userList = res.UserList;
        if (userList.length === 0) {
          return descriptionString;
        }
        const displayNameMap: { [k: string]: string } = userList.reduce((userMap: { [k: string]: string}, user: User) => {
          userMap[user.PublicKeyBase58Check] = user?.ProfileEntryResponse?.Username || user.PublicKeyBase58Check;
          return userMap;
        }, {});
        let outputString = descriptionString;
        for (const [publicKey, displayName] of Object.entries(displayNameMap)) {
          outputString = outputString.replace(publicKey, displayName);
        };
        return outputString;
      }));
  }

  // Returns username if truthy, otherwise public key
  getNameOrPublicKey(username: string | null | undefined, publicKey: string): string {
    return username || publicKey;
  }
}

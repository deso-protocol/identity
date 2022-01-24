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
  TransactionMetadataAuthorizeDerivedKey,
  TransactionMetadataMessagingGroup,
  TransactionMetadataDAOCoin,
  TransactionMetadataTransferDAOCoin
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
    let publicKeys: string[] = [];
    switch (this.transaction.metadata.constructor) {
      case TransactionMetadataBasicTransfer:
        const outputs: any[] = [];
        let sendingToSelf = true;

        for (const output of this.transaction.outputs) {
          // Skip the change output. 0 means the buffers are equal
          if (Buffer.compare(output.publicKey, this.transaction.publicKey) !== 0) {
            sendingToSelf = false;
            const sendKey = this.base58KeyCheck(output.publicKey);
            const sendAmount = this.nanosToUnitString(output.amountNanos);
            outputs.push(`${sendAmount} $DESO to ${sendKey}`);
            publicKeys.push(sendKey);
          }
        }

        // if all recipients are same as this.transaction.publicKey (outputs is empty)
        if (sendingToSelf && this.transaction.outputs.length > 0) {
          const selfPublicKey = this.base58KeyCheck(this.transaction.publicKey);
          publicKeys.push(selfPublicKey);
          outputs.push(`$DESO to ${selfPublicKey}`);
        }

        description = `send ${outputs.join(', ')}`;
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
        const followAction = this.transaction.metadata.isUnfollow ? "unfollow" : "follow";
        const followedPublicKey = this.base58KeyCheck(this.transaction.metadata.followedPublicKey);
        publicKeys = [followedPublicKey];
        description = `${followAction} ${followedPublicKey}`;
        break;

      case TransactionMetadataLike:
        description = this.transaction.metadata.isUnlike ? 'unlike a post' : 'like a post';
        break;

      case TransactionMetadataCreatorCoin:
        const operationType = this.transaction.metadata.operationType;
        const creatorCoinPublicKey = this.base58KeyCheck(this.transaction.metadata.profilePublicKey);
        publicKeys = [creatorCoinPublicKey];
        if (operationType === 0) {
          const desoToSell = this.nanosToUnitString(this.transaction.metadata.desoToSellNanos);
          description = `spend ${desoToSell} $DESO to buy the creator coin of ${creatorCoinPublicKey}`;
        } else if (operationType === 1) {
          const creatorCoinToSell = this.nanosToUnitString(this.transaction.metadata.creatorCoinToSellNanos);
          description = `sell ${creatorCoinToSell} creator coins of ${creatorCoinPublicKey}`;
        } else if (operationType === 2) {
          const desoToAdd = this.nanosToUnitString(this.transaction.metadata.desoToAddNanos);
          description = `add ${creatorCoinPublicKey} creator coin for ${desoToAdd} $DESO`;
        }
        break;

      case TransactionMetadataSwapIdentity:
        description = 'swap identities';
        break;

      case TransactionMetadataUpdateGlobalParams:
        description = 'update global params';
        break;

      case TransactionMetadataCreatorCoinTransfer:
        const transferAmount = this.nanosToUnitString(this.transaction.metadata.creatorCoinToTransferNanos);
        const creatorCoinTransferPublicKey = this.base58KeyCheck(this.transaction.metadata.profilePublicKey);
        const receiverPublicKey = this.base58KeyCheck(this.transaction.metadata.receiverPublicKey);
        publicKeys = [creatorCoinTransferPublicKey, receiverPublicKey];
        description = `transfer ${transferAmount} creator coin of ${creatorCoinTransferPublicKey} to ${receiverPublicKey}`;
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
      case TransactionMetadataDAOCoin:
        const daoCoinPublicKey = this.base58KeyCheck(this.transaction.metadata.profilePublicKey);
        publicKeys = [daoCoinPublicKey]
        if (this.transaction.metadata.operationType === 0) {
          const mintAmount = this.hexNanosToUnitString(this.transaction.metadata.coinsToMintNanos);
          description = `mint ${mintAmount} ${daoCoinPublicKey} DAO coins`;
        } else if (this.transaction.metadata.operationType === 1) {
          const burnAmount = this.hexNanosToUnitString(this.transaction.metadata.coinsToBurnNanos);
          description = `burn ${burnAmount} ${daoCoinPublicKey} DAO coins`;
        } else if (this.transaction.metadata.operationType === 2) {
          description = `disabling minting of ${daoCoinPublicKey} DAO coins`;
        } else if (this.transaction.metadata.operationType === 3) {
          description = `update transfer restriction status for ${daoCoinPublicKey} DAO coins`;
        }
        break;
      case TransactionMetadataTransferDAOCoin:
        const daoCoinTransferAmount = this.hexNanosToUnitString(this.transaction.metadata.daoCoinToTransferNanos);
        const daoCoinTransferPublicKey = this.base58KeyCheck(this.transaction.metadata.profilePublicKey);
        const daoCoinReceiverPublicKey = this.base58KeyCheck(this.transaction.metadata.receiverPublicKey);
        publicKeys = [daoCoinTransferPublicKey, daoCoinReceiverPublicKey];
        description = `transfer ${daoCoinTransferAmount} ${daoCoinTransferPublicKey} DAO coins to ${daoCoinReceiverPublicKey}`;
        break;
      case TransactionMetadataMessagingGroup:
        const groupKeyName = this.transaction.metadata.messagingGroupKeyName
        description = `register group key with name "${groupKeyName}"`
        break
    }

    // Set the transaction description based on the description populated with public keys.
    this.transactionDescription = description;
    // Fetch Usernames from the API and replace public keys with usernames in the description for a more useful message.
    this.getDescriptionWithUsernames(publicKeys, description).subscribe((res) => this.transactionDescription = res);
  }

  keyName(publicKey: string): string {
    return publicKey;
  }

  base58KeyCheck(keyBytes: Uint8Array): string {
    const prefix = CryptoService.PUBLIC_KEY_PREFIXES[this.globalVars.network].deso;
    return bs58check.encode(Buffer.from([...prefix, ...keyBytes]));
  }

  hexNanosToUnitString(nanos: Buffer): string {
    return this.nanosToUnitString(parseInt(nanos.toString('hex'), 16));
  }

  nanosToUnitString(nanos: number): string {
    // Change nanos into a formatted string of units. This combination of toFixed and regex removes trailing zeros.
    // If we do a regular toString(), some numbers can be represented in E notation which doesn't look as good.
    return (nanos / 1e9).toFixed(9).replace(/([0-9]+(\.[0-9]+[1-9])?)(\.?0+$)/,'$1');
  }

  // Fetch Usernames from API and replace public keys in description with Username
  getDescriptionWithUsernames(publicKeys: string[], description: string): Observable<string> {
    // If there are no public keys, we can just return the description as is.
    if (publicKeys.length === 0) {
      return of(description);
    }
    // Otherwise, we hit get-users-stateless to fetch profiles.
    return this.backendApi.GetUsersStateless(publicKeys, true).pipe((map(res => {
      const userList = res.UserList;
      // If the response has no users, return the description as is.
      if (userList.length === 0) {
        return description;
      }
      // Convert the list of users to a map of PublicKeyBase58Check to Username that we can use to replace in the description.
      const usernameMap: { [k: string]: string } = userList.reduce((userMap: { [k: string]: string }, user: User) => {
        const username = user?.ProfileEntryResponse?.Username;
        if (username) {
          userMap[user.PublicKeyBase58Check] = username;
        }
        return userMap;
      }, {});
      let outputString = description;
      // Iterate over key-value pairs and replace public key with username
      for (const [publicKey, username] of Object.entries(usernameMap)) {
        outputString = outputString.replace(publicKey, username);
      }
      return outputString;
    })));
  }
}

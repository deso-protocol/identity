import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CryptoService } from '../crypto.service';
import { IdentityService } from '../identity.service';
import { AccountService } from '../account.service';
import { GlobalVarsService } from '../global-vars.service';
import { SigningService } from '../signing.service';
import {
  BackendAPIService,
  CreatorCoinLimitOperationString,
  ProfileEntryResponse,
  TransactionSpendingLimitResponse,
  User,
} from '../backend-api.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
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
  TransactionMetadataTransferDAOCoin,
  TransactionSpendingLimit,
  TransactionMetadataDAOCoinLimitOrder,
} from '../../lib/deso/transaction';
import bs58check from 'bs58check';

@Component({
  selector: 'app-approve',
  templateUrl: './approve.component.html',
  styleUrls: ['./approve.component.scss'],
})
export class ApproveComponent implements OnInit {
  transaction: Transaction = new Transaction();
  publicKey: any;
  transactionHex: any;
  username: any;
  transactionDescription: any;
  transactionDeSoSpent: string | boolean = false;
  tsl: TransactionSpendingLimit | null = null;

  derivedKeyMemo: string = '';
  transactionSpendingLimitResponse:
    | TransactionSpendingLimitResponse
    | undefined = undefined;

  constructor(
    private activatedRoute: ActivatedRoute,
    private cryptoService: CryptoService,
    private identityService: IdentityService,
    private accountService: AccountService,
    public globalVars: GlobalVarsService,
    private signingService: SigningService,
    private backendApi: BackendAPIService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.transactionHex = params.tx;
      this.backendApi
        .GetTransactionSpending(this.transactionHex)
        .subscribe((res) => {
          this.transactionDeSoSpent = res ? this.nanosToUnitString(res) : false;
        });
      const txBytes = new Buffer(this.transactionHex, 'hex');
      this.transaction = Transaction.fromBytes(txBytes)[0] as Transaction;
      this.publicKey = this.base58KeyCheck(this.transaction.publicKey);

      this.generateTransactionDescription();
    });
  }

  onCancel(): void {
    this.finishFlow();
  }

  onSubmit(): void {
    const signedTransactionHex = this.signingService.signTransaction(
      this.seedHex(),
      this.transactionHex
    );
    this.finishFlow(signedTransactionHex);
  }

  finishFlow(signedTransactionHex?: string): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      signedTransactionHex,
    });
  }

  seedHex(): string {
    const encryptedSeedHex =
      this.accountService.getEncryptedUsers()[this.publicKey].encryptedSeedHex;
    return this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
  }

  generateTransactionDescription(): void {
    let description = 'sign an unknown transaction';
    let publicKeys: string[] = [];

    switch (this.transaction.metadata?.constructor) {
      case TransactionMetadataBasicTransfer:
        const outputs: any[] = [];
        let sendingToSelf = true;

        for (const output of this.transaction.outputs) {
          // Skip the change output. 0 means the buffers are equal
          if (
            Buffer.compare(output.publicKey, this.transaction.publicKey) !== 0
          ) {
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
        const followMetadata = this.transaction
          .metadata as TransactionMetadataFollow;
        const followAction = followMetadata.isUnfollow ? 'unfollow' : 'follow';
        const followedPublicKey = this.base58KeyCheck(
          followMetadata.followedPublicKey
        );
        publicKeys = [followedPublicKey];
        description = `${followAction} ${followedPublicKey}`;
        break;

      case TransactionMetadataLike:
        description = (this.transaction.metadata as TransactionMetadataLike)
          .isUnlike
          ? 'unlike a post'
          : 'like a post';
        break;

      case TransactionMetadataCreatorCoin:
        const ccMetadata = this.transaction
          .metadata as TransactionMetadataCreatorCoin;
        const operationType = ccMetadata.operationType;
        const creatorCoinPublicKey = this.base58KeyCheck(
          ccMetadata.profilePublicKey
        );
        publicKeys = [creatorCoinPublicKey];
        if (operationType === 0) {
          const desoToSell = this.nanosToUnitString(ccMetadata.desoToSellNanos);
          description = `spend ${desoToSell} $DESO to buy the creator coin of ${creatorCoinPublicKey}`;
        } else if (operationType === 1) {
          const creatorCoinToSell = this.nanosToUnitString(
            ccMetadata.creatorCoinToSellNanos
          );
          description = `sell ${creatorCoinToSell} creator coins of ${creatorCoinPublicKey}`;
        } else if (operationType === 2) {
          const desoToAdd = this.nanosToUnitString(ccMetadata.desoToAddNanos);
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
        const ccTransferMetadata = this.transaction
          .metadata as TransactionMetadataCreatorCoinTransfer;
        const transferAmount = this.nanosToUnitString(
          ccTransferMetadata.creatorCoinToTransferNanos
        );
        const creatorCoinTransferPublicKey = this.base58KeyCheck(
          ccTransferMetadata.profilePublicKey
        );
        const receiverPublicKey = this.base58KeyCheck(
          ccTransferMetadata.receiverPublicKey
        );
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
        const authorizeDKMetadata = this.transaction
          .metadata as TransactionMetadataAuthorizeDerivedKey;
        if (authorizeDKMetadata.operationType === 0) {
          description = 'de-authorize a derived key';
        } else if (authorizeDKMetadata.operationType === 1) {
          description = 'authorize a derived key';
        }

        // Parse the transaction spending limit and memo from the extra data
        for (const kv of this.transaction.extraData?.kvs || []) {
          if (kv.key.toString() === 'TransactionSpendingLimit') {
            // Hit the backend to get the TransactionSpendingLimit response from the bytes we have in the value.
            //
            // TODO: There is a small attack surface here. If someone gains control of the
            // backendApi node, they can swap a fake value into here, and trick the user
            // into giving up control of their key. The solution is to parse the hex here in
            // the frontend code rather than relying on the backend to do it, but we're
            // OK trading off some security for convenience here short-term.
            this.backendApi
              .GetTransactionSpendingLimitResponseFromHex(
                kv.value.toString('hex')
              )
              .subscribe((res) => {
                this.transactionSpendingLimitResponse = res;
              });
          }
          if (kv.key.toString() === 'DerivedKeyMemo') {
            this.derivedKeyMemo = new Buffer(
              kv.value.toString(),
              'hex'
            ).toString();
          }
        }
        break;
      case TransactionMetadataDAOCoin:
        const daoCoinMetadata = this.transaction
          .metadata as TransactionMetadataDAOCoin;
        const daoCoinPublicKey = this.base58KeyCheck(
          daoCoinMetadata.profilePublicKey
        );
        publicKeys = [daoCoinPublicKey];
        if (daoCoinMetadata.operationType === 0) {
          const mintAmount = this.hexNanosToUnitString(
            daoCoinMetadata.coinsToMintNanos
          );
          description = `mint ${mintAmount} ${daoCoinPublicKey} DAO coins`;
        } else if (daoCoinMetadata.operationType === 1) {
          const burnAmount = this.hexNanosToUnitString(
            daoCoinMetadata.coinsToBurnNanos
          );
          description = `burn ${burnAmount} ${daoCoinPublicKey} DAO coins`;
        } else if (daoCoinMetadata.operationType === 2) {
          description = `disabling minting of ${daoCoinPublicKey} DAO coins`;
        } else if (daoCoinMetadata.operationType === 3) {
          description = `update transfer restriction status for ${daoCoinPublicKey} DAO coins`;
        }
        break;
      case TransactionMetadataTransferDAOCoin:
        const daoCoinTransferMetadata = this.transaction
          .metadata as TransactionMetadataTransferDAOCoin;
        const daoCoinTransferAmount = this.hexNanosToUnitString(
          daoCoinTransferMetadata.daoCoinToTransferNanos
        );
        const daoCoinTransferPublicKey = this.base58KeyCheck(
          daoCoinTransferMetadata.profilePublicKey
        );
        const daoCoinReceiverPublicKey = this.base58KeyCheck(
          daoCoinTransferMetadata.receiverPublicKey
        );
        publicKeys = [daoCoinTransferPublicKey, daoCoinReceiverPublicKey];
        description = `transfer ${daoCoinTransferAmount} ${daoCoinTransferPublicKey} DAO coins to ${daoCoinReceiverPublicKey}`;
        break;
      case TransactionMetadataMessagingGroup:
        const messagingGroupMetadata = this.transaction
          .metadata as TransactionMetadataMessagingGroup;
        const groupKeyName = messagingGroupMetadata.messagingGroupKeyName;
        description = `register group key with name "${groupKeyName}"`;
        break;
      case TransactionMetadataDAOCoinLimitOrder:
        const daoCoinLimitOrderMetadata = this.transaction
          .metadata as TransactionMetadataDAOCoinLimitOrder;
        if (
          daoCoinLimitOrderMetadata.cancelOrderID != null &&
          daoCoinLimitOrderMetadata.cancelOrderID.length != 0
        ) {
          // The transaction is cancelling an existing limit order
          const orderId =
            daoCoinLimitOrderMetadata.cancelOrderID.toString('hex');
          description = `cancel the DAO coin limit order with OrderID: ${orderId}`;
        } else {
          // The transaction must be creating a new limit order
          publicKeys = [];

          let buyingCoin = '$DESO';
          let sellingCoin = '$DESO';

          // If the buying coin's public key is a zero byte array, then the coin is $DESO. Otherwise, it's a DAO coin
          if (
            !this.isZeroByteArray(
              daoCoinLimitOrderMetadata.buyingDAOCoinCreatorPublicKey
            )
          ) {
            const buyingCoinPublicKey = this.base58KeyCheck(
              daoCoinLimitOrderMetadata.buyingDAOCoinCreatorPublicKey
            );
            buyingCoin = buyingCoinPublicKey + ' DAO coins';
            publicKeys.push(buyingCoinPublicKey);
          }

          // Similar to the above, a zero byte array means that $DESO is being sold. Otherwise, it's a DAO coin
          if (
            !this.isZeroByteArray(
              daoCoinLimitOrderMetadata.sellingDAOCoinCreatorPublicKey
            )
          ) {
            const sellingCoinPublicKey = this.base58KeyCheck(
              daoCoinLimitOrderMetadata.sellingDAOCoinCreatorPublicKey
            );
            sellingCoin = sellingCoinPublicKey + ' DAO coins';
            publicKeys.push(sellingCoinPublicKey);
          }

          const exchangeRateCoinsToSellPerCoinToBuy =
            this.hexScaledExchangeRateToFloat(
              daoCoinLimitOrderMetadata.scaledExchangeRateCoinsToSellPerCoinToBuy
            );
          const quantityToFill = this.hexNanosToUnitString(
            daoCoinLimitOrderMetadata.quantityToFillInBaseUnits
          );
          const daoCoinLimitOrderOperationType =
            daoCoinLimitOrderMetadata.operationType.toString();
          const daoCoinLimitOrderFillType =
            daoCoinLimitOrderMetadata.fillType.toString();

          const exchangeRateCoinsToSellPerCoinsToBuyPhrase =
            exchangeRateCoinsToSellPerCoinToBuy === 0
              ? `using ${sellingCoin} at any exchange rate`
              : `at an exchange rate of ${this.toFixedLengthDecimalString(
                  exchangeRateCoinsToSellPerCoinToBuy
                )} ` + `${sellingCoin} per coin bought`;
          const exchangeRateCoinsToBuyPerCoinsToSellPhrase =
            exchangeRateCoinsToSellPerCoinToBuy === 0
              ? `for ${buyingCoin} at any exchange rate`
              : `at an exchange rate of ${this.toFixedLengthDecimalString(
                  1 / exchangeRateCoinsToSellPerCoinToBuy
                )} ` + `${buyingCoin} per coin sold`;

          const daoCoinLimitOrderFillTypePhrase =
            daoCoinLimitOrderFillType === '1'
              ? 'a Good-Till-Cancelled'
              : daoCoinLimitOrderFillType === '2'
              ? 'an Immediate-Or-Cancel'
              : daoCoinLimitOrderFillType === '3'
              ? 'a Fill-Or-Kill'
              : `an unknown fill type (${daoCoinLimitOrderFillType})`;

          if (daoCoinLimitOrderOperationType === '1') {
            // -- ASK Order --
            description =
              `create ${daoCoinLimitOrderFillTypePhrase} order to sell ${quantityToFill} ` +
              `${sellingCoin} ${exchangeRateCoinsToBuyPerCoinsToSellPhrase}`;
          } else if (daoCoinLimitOrderOperationType === '2') {
            // -- BID Order --
            description =
              `create ${daoCoinLimitOrderFillTypePhrase} order to buy ${quantityToFill} ` +
              `${buyingCoin} ${exchangeRateCoinsToSellPerCoinsToBuyPhrase}`;
          } else {
            // Operation type is unknown, so we'll print all the order metadata as-is without much interpretation.
            // The goal here is to give the user as much info as we know, and let them make the decision.
            const daoCoinOperationTypePhrase = `an unknown operation type (${daoCoinLimitOrderOperationType})`;
            const exchangeRate = this.toFixedLengthDecimalString(
              exchangeRateCoinsToSellPerCoinToBuy
            );
            description =
              `create ${daoCoinLimitOrderFillTypePhrase} order that has ${daoCoinOperationTypePhrase} to swap ` +
              `${sellingCoin} for ${buyingCoin} with an exchange rate of ${exchangeRate} and a quantity of ${quantityToFill}`;
          }
        }
        break;
    }

    // Set the transaction description based on the description populated with public keys.
    this.transactionDescription = description;
    // Fetch Usernames from the API and replace public keys with usernames in the description for a more useful message.
    this.getDescriptionWithUsernames(publicKeys, description).subscribe(
      (res) => (this.transactionDescription = res)
    );
  }

  keyName(publicKey: string): string {
    return publicKey;
  }

  base58KeyCheck(keyBytes: Uint8Array): string {
    const prefix =
      CryptoService.PUBLIC_KEY_PREFIXES[this.globalVars.network].deso;
    return bs58check.encode(Buffer.from([...prefix, ...keyBytes]));
  }

  hexNanosToUnitString(nanos: Buffer): string {
    return this.nanosToUnitString(parseInt(nanos.toString('hex'), 16));
  }

  nanosToUnitString(nanos: number): string {
    return this.toFixedLengthDecimalString(nanos / 1e9);
  }

  hexScaledExchangeRateToFloat(hex: Buffer): number {
    return parseInt(hex.toString('hex'), 16) / 1e38;
  }

  toFixedLengthDecimalString(num: number): string {
    // Change nanos into a formatted string of units. This combination of toFixed and regex removes trailing zeros.
    // If we do a regular toString(), some numbers can be represented in E notation which doesn't look as good.
    const formattedNum = num.toFixed(9).replace(/^(\d*\.\d*?[1-9]?)0+$/, '$1');
    // Integers may have a trailing decimal place, so if we end with a decimal place, we slice off the last character.
    return formattedNum.endsWith('.')
      ? formattedNum.slice(0, formattedNum.length - 1)
      : formattedNum;
  }

  isZeroByteArray(buffer: Buffer): boolean {
    return parseInt(buffer.toString('hex'), 16) == 0;
  }

  // Fetch Usernames from API and replace public keys in description with Username
  getDescriptionWithUsernames(
    publicKeys: string[],
    description: string
  ): Observable<string> {
    // If there are no public keys, we can just return the description as is.
    if (publicKeys.length === 0) {
      return of(description);
    }
    // Otherwise, we hit get-users-stateless to fetch profiles.
    return this.backendApi.GetUsersStateless(publicKeys, true).pipe(
      map((res) => {
        const userList = res.UserList;
        // If the response has no users, return the description as is.
        if (userList.length === 0) {
          return description;
        }
        // Convert the list of users to a map of PublicKeyBase58Check to Username that we can use to replace in the description.
        const usernameMap: { [k: string]: string } = userList.reduce(
          (userMap: { [k: string]: string }, user: User) => {
            const username = user?.ProfileEntryResponse?.Username;
            if (username) {
              userMap[user.PublicKeyBase58Check] = username;
            }
            return userMap;
          },
          {}
        );
        let outputString = description;
        // Iterate over key-value pairs and replace public key with username
        for (const [publicKey, username] of Object.entries(usernameMap)) {
          outputString = outputString.replace(publicKey, username);
        }
        return outputString;
      })
    );
  }
}

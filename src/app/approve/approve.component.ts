import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CryptoService} from '../crypto.service';
import {IdentityService} from '../identity.service';
import {AccountService} from '../account.service';
import {GlobalVarsService} from '../global-vars.service';
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
  TransactionMetadataBurnNFT
} from '../../lib/deso/transaction';
import {SigningService} from '../signing.service';
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

  constructor(
    private activatedRoute: ActivatedRoute,
    private cryptoService: CryptoService,
    private identityService: IdentityService,
    private accountService: AccountService,
    public globalVars: GlobalVarsService,
    private signingService: SigningService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.transactionHex = params.tx;

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
        const outputs = [];

        let sendingToSelf = true; //for if sender and recipient are same account

        for (const output of this.transaction.outputs) {
          // Skip the change output. 0 means the buffers are equal
          if (Buffer.compare(output.publicKey, this.transaction.publicKey) !== 0) {
            sendingToSelf = false;
            const sendKey = this.base58KeyCheck(output.publicKey);
            const sendAmount = `${output.amountNanos / 1e9}`;
            outputs.push(`${sendAmount} DESO to ${sendKey}`);
          }
        }

        //if all recipients are same as this.transaction.publicKey (outputs is empty)
        if (sendingToSelf && this.transaction.outputs.length > 0) {
          outputs.push(`$DESO to ${this.transaction.publicKey}`);
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
        const followedKey = this.base58KeyCheck(this.transaction.metadata.followedPublicKey);
        description = `follow ${this.keyName(followedKey)}`;
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
        if (this.transaction.metadata.operationType === 0) {
          description = `buy ${creatorKey}`;
        } else if (this.transaction.metadata.operationType === 1) {
          description = `sell ${creatorKey}`;
        } else if (this.transaction.metadata.operationType === 3) {
          description = `transfer ${creatorKey}`;
        }
        break;

      case TransactionMetadataSwapIdentity:
        description = 'swap identities';
        break;

      case TransactionMetadataUpdateGlobalParams:
        description = 'update global params';
        break;

      case TransactionMetadataCreatorCoinTransfer:
        description = 'transfer a creator coin';
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
}

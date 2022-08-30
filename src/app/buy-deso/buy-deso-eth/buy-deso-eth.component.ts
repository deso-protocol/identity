import {
  Component,
  OnInit,
  Input,
  NgModule,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import { BackendAPIService } from '../../backend-api.service';
import { sprintf } from 'sprintf-js';
import { SwalHelper } from '../../../lib/helpers/swal-helper';
import { IdentityService } from '../../identity.service';
import { BuyDeSoComponent } from '../buy-deso/buy-deso.component';
import { fromWei, hexToNumber, toHex, toBN, toWei } from 'web3-utils';
import { Hex } from 'web3-utils/types';
import Common, { Chain, Hardfork } from '@ethereumjs/common';
import {
  FeeMarketEIP1559Transaction,
  Transaction as LegacyTransaction,
  TxData,
  TxOptions,
} from '@ethereumjs/tx';
import { FeeMarketEIP1559TxData } from '@ethereumjs/tx/src/types';
import { TextService } from '../../text.service';
import { Transaction, TransactionOptions } from 'ethereumjs-tx';
import { BN } from 'ethereumjs-util';
import { AccountService } from '../../account.service';
import { SigningService } from '../../signing.service';
import { Network } from 'src/types/identity';

const feeMarketTransaction = FeeMarketEIP1559Transaction;

class Messages {
  static INCORRECT_PASSWORD = `The password you entered was incorrect.`;
  static INSUFFICIENT_BALANCE = `Your balance is insufficient to complete the transaction.`;
  static INSUFFICIENT_FEES = `Your purchase is insufficient to cover the transaction fees.`;
  static CONNECTION_PROBLEM = `We had a problem processing your transaction. Please wait a few minutes and try again.`;
  static UNKOWN_PROBLEM = `There was a weird problem with the transaction. Debug output: %s`;
  static NOT_MINED = `Your ETH is still mining. Please try again in one minute.`;

  static CONFIRM_BUY_DESO = `Are you ready to exchange %s ETH for %s DESO?`;
  static ZERO_DESO_ERROR = `You must purchase a non-zero amount DESO`;
  static NEGATIVE_DESO_ERROR = `You must purchase a non-negative amount of DESO`;
  static RPC_ERROR = `RPC Error`;
}

type TransactionType =
  | Transaction
  | LegacyTransaction
  | FeeMarketEIP1559Transaction;

type TypeOfTransactionType =
  | typeof Transaction
  | typeof LegacyTransaction
  | typeof FeeMarketEIP1559Transaction;

// tslint:disable-next-line:no-shadowed-variable
type SignedTransaction<TransactionType> = {
  signedTx: TransactionType;
  toSign: string[];
};

type FeeDetails = {
  baseFeePerGas: BN;
  maxPriorityFeePerGas: BN;
  maxPriorityFeePerGasHex: Hex;
  maxFeePerGas: BN;
  maxFeePerGasHex: Hex;
  totalFeesEIP1559: BN;
  gasPrice: BN;
  gasPriceHex: Hex;
  totalFeesLegacy: BN;
  maxLegacyGasPrice: BN;
  maxTotalFeesLegacy: BN;
  maxLegacyGasPriceHex: string;
};

@Component({
  selector: 'buy-deso-eth',
  templateUrl: './buy-deso-eth.component.html',
  styleUrls: ['./buy-deso-eth.component.scss'],
})
export class BuyDeSoEthComponent implements OnInit {
  static instructionsPerBasicTransfer = toBN(21000);

  // Flip to false to use EIP 1559 transactions with MaxFeePerGas and MaxPriorityFeePerGas.
  // Flip to true to use legacy transactions.
  static useLegacyTransaction = true;

  // Flip to true to log fees when testing.
  static logFees = false;

  // @ts-ignore
  @Input() parentComponent: BuyDeSoComponent;
  @Input() publicKey = '';
  @Input() seedHex = '';

  buyWithEthStep = 1;
  keyIsCopied = false;

  // Current balance in ETH
  // Eth balance is only for display purposes.
  ethBalance = 0;
  weiBalance: BN = new BN(0);
  loadingBalance = false;
  loadingFee = false;

  // Network fees in ETH (with sane default)
  // ETH fee estimate is only for display purposes.
  ethFeeEstimate = 0.002;
  weiFeeEstimate: BN = new BN(0);

  // ETH to exchange (not including fees)
  // Eth To Exchange is only for display purposes.
  ethToExchange = 0;
  weiToExchange: BN = new BN(0);

  // DESO to Buy
  desoToBuy = 0;

  // User errors
  error = '';

  // @ts-ignore
  common: Common;

  constructor(
    public globalVars: GlobalVarsService,
    private backendAPIService: BackendAPIService,
    private identityService: IdentityService,
    private textService: TextService,
    private accountService: AccountService,
    private signingService: SigningService
  ) {}

  _copyPublicKey(): void {
    this.textService.copyText(this.ethDepositAddress());
    this.keyIsCopied = true;
    setInterval(() => {
      this.keyIsCopied = false;
    }, 1000);
  }

  ethDepositAddress(): string {
    const user = this.accountService.getEncryptedUsers()[this.publicKey];
    const ethAddress = user?.ethDepositAddress;

    if (ethAddress != null && user.version >= 1) {
      return ethAddress;
    } else {
      return 'Please re-login to generate an ETH address';
    }
  }

  stepOneTooltip(): string {
    return (
      'DESO can be purchased in just a few minutes using ETH.\n\n' +
      'To get started, simply send ETH to your deposit address below. Note that deposits should show up ' +
      'within thirty seconds or so but sometimes, for various technical reasons, it can take up to an hour ' +
      '(though this should be extremely rare).\n\n' +
      "Once you've deposited ETH, you can swap it for DESO in step two below. If it's your first " +
      'time doing this, we recommend starting with a small test amount of ETH to get comfortable with the flow.'
    );
  }

  depositEthTooltip(): string {
    return 'Send ETH to this address so that you can swap it for DESO in step two below.';
  }

  minDepositTooltip(): string {
    return (
      'This is the minimum amount required to cover the Ethereum ' +
      'network fees associated with your purchase. We would love to make this ' +
      'lower, but if we did then the Ethereum network would reject your transaction.'
    );
  }

  withdrawEthTooltip(): string {
    return (
      'If you send too much ETH to your deposit address and need to get it back, you ' +
      'can access the ETH in this address by importing your Seed Hex into most standard Ethereum wallets. ' +
      "We don't display this easily for security purposes. To see your Seed Hex open your browser's developer " +
      'tools, then select Storage -> DeSo Identity -> Users -> Public Key -> Seed Hex.'
    );
  }

  balanceUpdateTooltip(): string {
    return (
      'Normally, when you send ETH to the deposit address, it will show up instantly. ' +
      'However, it can take up to an hour in rare cases depending on where you send it from.'
    );
  }

  ethereumNetworkFeeTooltip(): string {
    return (
      'The process of exchanging ETH for DESO requires posting a transaction to ' +
      'the Ethereum blockchain. For this reason, we must add a network fee to ' +
      'incentivize miners to process the transaction.'
    );
  }

  _alertError(
    err: any,
    showBuyDeSo: boolean = false,
    showBuyCreatorCoin: boolean = false
  ): void {
    if (err === 'Your balance is insufficient.') {
      showBuyDeSo = true;
    }

    SwalHelper.fire({
      target: 'app-sign-up',
      icon: 'error',
      title: `Oops...`,
      html: err,
      showConfirmButton: true,
      showCancelButton: showBuyDeSo || showBuyCreatorCoin,
      focusConfirm: true,
      customClass: {
        confirmButton: 'btn btn-light',
        cancelButton: 'btn btn-light no',
      },
      confirmButtonText: showBuyDeSo
        ? 'Buy DeSo'
        : showBuyCreatorCoin
        ? 'Buy Creator Coin'
        : 'Ok',
      reverseButtons: true,
    });
  }

  clickBuyDESO(): void {
    if (this.globalVars == null || this.publicKey == null) {
      return;
    }

    if (this.desoToBuy === 0) {
      this._alertError(Messages.ZERO_DESO_ERROR);
      return;
    }

    if (this.desoToBuy < 0) {
      this._alertError(Messages.NEGATIVE_DESO_ERROR);
      return;
    }

    if (this.weiToExchange.gt(this.weiBalance)) {
      this._alertError(Messages.INSUFFICIENT_BALANCE);
      return;
    }

    if (this.weiToExchange.lt(this.weiFeeEstimate)) {
      this._alertError(Messages.INSUFFICIENT_FEES);
      return;
    }

    if (this.error != null && this.error !== '') {
      this._alertError(this.error);
      return;
    }

    const confirmBuyDESOString = sprintf(
      Messages.CONFIRM_BUY_DESO,
      fromWei(this.weiToExchange),
      this.desoToBuy
    );

    SwalHelper.fire({
      target: 'app-sign-up',
      title: 'Are you ready?',
      html: confirmBuyDESOString,
      showCancelButton: true,
      customClass: {
        confirmButton: 'btn btn-light',
        cancelButton: 'btn btn-light no',
      },
      reverseButtons: true,
    }).then((res: any) => {
      if (res.isConfirmed) {
        return this.signAndSubmitETH(true);
      }
      return;
    });
  }

  signAndSubmitETH(retry: boolean = false): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      (BuyDeSoEthComponent.useLegacyTransaction
        ? this.constructLegacyTransactionOld()
        : this.constructFeeMarketTransaction()
      ).then((res) => {
        if (!res?.signedTx) {
          console.error('No signedTx found - aborting');
          resolve('No signedTx found - aborting');
          return;
        }
        const signedHash = res.signedTx.serialize().toString('hex');
        // Submit the transaction.
        this.parentComponent.waitingOnTxnConfirmation = true;
        this.backendAPIService
          .SubmitETHTx(this.publicKey, res.signedTx, res.toSign, [signedHash])
          .subscribe(
            (res) => {
              // Reset all the form fields
              this.error = '';
              this.desoToBuy = 0;
              this.ethToExchange = 0;
              this.weiToExchange = new BN(0);
              // This will update the balance and a bunch of other things.
              this.parentComponent.waitForTransaction(res.DESOTxHash);
              resolve(true);
            },
            (err) => {
              if (
                err.error?.error &&
                err.error?.error.includes('RPC Error') &&
                retry
              ) {
                console.error(err);
                // Sometimes fees will change between the time they were fetched and the transaction was broadcasted.
                // To combat this, we will retry by fetching fees again and constructing/signing/broadcasting the
                // transaction again.
                this.signAndSubmitETH(false).then(
                  // tslint:disable-next-line:no-shadowed-variable
                  (res) => {
                    resolve(res);
                  },
                  // tslint:disable-next-line:no-shadowed-variable
                  (err) => {
                    reject(err);
                  }
                );
              } else {
                this.parentComponent._clickBuyDeSoFailure(
                  this.parentComponent,
                  this.extractError(err)
                );
                reject(err);
              }
            }
          );
      });
    });
  }

  // constructFeeMarketTransaction creates a Signed EIP-1559 transaction with maxPriorityFeePerGas and maxFeePerGas
  // using the maintained ethereumjs/tx library. Sometimes EIP-1559 transactions are taking too long to mine or are not
  // mining at all due to gas calculations so this function is not currently used. Upgrading to using this function in
  // the future is preferred as we'll lower the amount of gas paid per transaction.
  constructFeeMarketTransaction(): Promise<SignedTransaction<TransactionType>> {
    return this.generateSignedTransaction<FeeMarketEIP1559Transaction>(
      FeeMarketEIP1559Transaction
    );
  }

  // constructLegacyTransaction creates a Signed Legacy transaction with gasPrice using the maintained ethereumjs/tx
  // library. There is an issue generating a valid signature for legacy transactions using the new library so this
  // is not actively used. However, upgrading to using this once that is resolved would be preferred as the old
  // ethereumjs-tx library is no longer maintained.
  constructLegacyTransaction(): Promise<SignedTransaction<TransactionType>> {
    return this.generateSignedTransaction<LegacyTransaction>(LegacyTransaction);
  }

  // constructLegacyTransactionOld creates a LegacyTransaction using the deprecated ethereum-tx library. This deprecated
  // library is being used as the updated version of this library causes issues generating a valid signature in identity
  // for legacy transactions. In the future, we should move to using constructFeeMarketTransaction.
  constructLegacyTransactionOld(): Promise<SignedTransaction<TransactionType>> {
    return this.generateSignedTransaction<Transaction>(Transaction);
  }

  // generateSignedTransaction is a generic function that given any type of Transaction will construct an unsigned
  // transaction with the appropriate transaction data and sign it using identity.
  generateSignedTransaction<Type extends TransactionType>(
    type: TypeOfTransactionType
  ): Promise<SignedTransaction<Type>> {
    return new Promise<SignedTransaction<Type>>((resolve, reject) => {
      this.backendAPIService
        .GetAppState()
        .toPromise()
        .then(
          (res) => {
            const buyETHAddress = res.BuyETHAddress;
            if (buyETHAddress === '') {
              reject('BuyETHAddress is empty');
              return;
            }
            return this.getNonceValueAndFees().then(
              ({ nonce, value, fees }) => {
                let txData: TxData = {};
                let feeMarketTxData: FeeMarketEIP1559TxData = {};
                txData = {
                  nonce,
                  value,
                  gasLimit: toHex(
                    BuyDeSoEthComponent.instructionsPerBasicTransfer
                  ),
                  to: buyETHAddress,
                };
                if (BuyDeSoEthComponent.useLegacyTransaction) {
                  txData.gasPrice = fees.maxLegacyGasPriceHex;
                } else {
                  feeMarketTxData = txData as FeeMarketEIP1559TxData;
                  feeMarketTxData.maxPriorityFeePerGas =
                    fees.maxPriorityFeePerGasHex;
                  feeMarketTxData.maxFeePerGas = fees.maxFeePerGasHex;
                  feeMarketTxData.chainId = toHex(this.getChain());
                }
                let toSign: string[] = [];
                switch (type) {
                  case Transaction: {
                    // @ts-ignore
                    const tx = new Transaction(txData, this.getOldOptions());
                    // Poached from the sign method on Transaction in deprecated ethereumjs-tx library which demonstrates how to
                    // get the equivalent of getMessageToSign in the new ethereumjs tx library.
                    tx.v = new Buffer([]);
                    tx.r = new Buffer([]);
                    tx.s = new Buffer([]);
                    toSign = [tx.hash(false).toString('hex')];
                    break;
                  }
                  case LegacyTransaction: {
                    // Generate an Unsigned Legacy Transaction from the data and generated a hash message to sign.
                    const tx = LegacyTransaction.fromTxData(txData, {
                      common: this.common,
                    });
                    toSign = [tx.getMessageToSign(true).toString('hex')];
                    break;
                  }
                  case FeeMarketEIP1559Transaction: {
                    // Generate an Unsigned EIP 1559 Fee Market Transaction from the data and generated a hash message to sign.
                    const tx = FeeMarketEIP1559Transaction.fromTxData(
                      feeMarketTxData,
                      { common: this.common }
                    );
                    toSign = [tx.getMessageToSign(true).toString('hex')];
                    break;
                  }
                }
                resolve(
                  this.getSignedTransactionFromUnsignedHex<Type>(
                    type === FeeMarketEIP1559Transaction
                      ? feeMarketTxData
                      : txData,
                    toSign,
                    type
                  )
                );
              }
            );
          },
          (err) => {
            reject(err);
          }
        );
    });
  }

  getTotalFee(fees: FeeDetails): BN {
    return BuyDeSoEthComponent.useLegacyTransaction
      ? fees.maxTotalFeesLegacy
      : fees.totalFeesEIP1559;
  }

  // getNonceValueAndFees is a helper to get the nonce, transaction value, and current fees when constructing a tx.
  getNonceValueAndFees(): Promise<{
    nonce: Hex;
    value: Hex;
    fees: FeeDetails;
  }> {
    return Promise.all([
      this.getTransactionCount(this.ethDepositAddress(), 'pending'),
      this.getFees(),
    ]).then(([transactionCount, fees]) => {
      const nonce = toHex(transactionCount);
      const value = this.getValue(fees);
      return {
        nonce,
        value,
        fees,
      };
    });
  }

  // getSignedTransactionFromUnsignedHex takes an unsigned transaction, signs it, and returns the requested type of
  // Transaction.
  getSignedTransactionFromUnsignedHex<Type extends TransactionType>(
    txData: TxData | FeeMarketEIP1559TxData,
    toSign: string[],
    signedTxType: TypeOfTransactionType
  ): Promise<SignedTransaction<Type>> {
    // Sign the ETH hash.
    const signedHashes = this.signingService.signHashesETH(
      this.seedHex,
      toSign
    );
    // Get the signature and merge it into the TxData defined above.
    const signature: { s: any; r: any; v: number | null } = signedHashes[0];
    // For Legacy transaction using the old library, we need to modify V to satisfy EIP 155 constraints.
    if (
      signedTxType === Transaction &&
      this.common.gteHardfork('spuriousDragon')
    ) {
      signature.v =
        signature.v === 0 ? this.getChain() * 2 + 35 : this.getChain() * 2 + 36;
    }
    // Merge the signature into the transaction data.
    const signedTxData = {
      ...txData,
      ...signature,
    };
    let signedTx: Transaction | LegacyTransaction | FeeMarketEIP1559Transaction;

    switch (signedTxType) {
      case Transaction: {
        // Create a signed Legacy transaction using the deprecated ethereumjs-tx library.
        // @ts-ignore
        signedTx = new Transaction(signedTxData, this.getOldOptions());
        break;
      }
      case LegacyTransaction: {
        // Create a signed Legacy transaction using the maintained ethereumjs/tx library.
        const legacyTxData = txData as TxData;
        signedTx = LegacyTransaction.fromTxData(
          legacyTxData,
          this.getOptions()
        );
        break;
      }
      case FeeMarketEIP1559Transaction: {
        // Create a Fee Market EIP-1559 transaction using the maintained ethereumjs/tx library.
        const feeMarketTxdata = txData as FeeMarketEIP1559TxData;
        signedTx = FeeMarketEIP1559Transaction.fromTxData(
          feeMarketTxdata,
          this.getOptions()
        );
        break;
      }
    }
    // Construct and serialize the transaction.
    return new Promise<SignedTransaction<Type>>((resolve, reject) => {
      resolve({ signedTx, toSign } as SignedTransaction<Type>);
    });
  }

  getValue(fees: FeeDetails): Hex {
    const totalFees = this.getTotalFee(fees);
    // Make sure that value + actual fees does not exceed the current balance. If it does, subtract the remainder from value.
    let value = this.weiToExchange.sub(totalFees);
    const remainder = totalFees.add(value).sub(this.weiBalance);
    if (remainder.gt(new BN(0))) {
      value = value.sub(remainder);
    }
    return toHex(value);
  }

  extractError(err: any): string {
    if (err.error != null && err.error.error != null) {
      const rawError = err.error.error;
      if (rawError.includes('Not enough funds')) {
        return Messages.INSUFFICIENT_BALANCE;
      } else if (rawError.includes('Failed to create fee transaction')) {
        return Messages.NOT_MINED;
      } else {
        return rawError;
      }
    }
    if (err.status != null && err.status !== 200) {
      return Messages.CONNECTION_PROBLEM;
    }
    // If we get here we have no idea what went wrong so just return the
    // errorString.
    return sprintf(Messages.UNKOWN_PROBLEM, JSON.stringify(err));
  }

  clickMaxDESO(): void {
    this.getFees().then((res) => {
      this.weiFeeEstimate = this.getTotalFee(res);
      this.ethFeeEstimate = Number(fromWei(this.weiFeeEstimate));
      this.weiToExchange = this.weiBalance;
      this.updateETHToExchange(fromWei(this.weiToExchange));
    });
  }

  computeETHToBurnGivenDESONanos(amountNanos: number): number {
    return Number(fromWei(this.computeWeiToBurnGivenDESONanos(amountNanos)));
  }

  computeWeiToBurnGivenDESONanos(amountNanos: number): BN {
    const weiMinusFees = new BN(amountNanos).mul(
      this.getWeiPerNanoExchangeRate()
    );
    return weiMinusFees.add(this.weiFeeEstimate);
  }

  computeNanosToCreateGivenWeiToBurn(weiToBurn: BN): number {
    const weiMinusFees = weiToBurn.sub(this.weiFeeEstimate);
    if (weiMinusFees.ltn(0)) {
      return 0;
    }
    return weiMinusFees.div(this.getWeiPerNanoExchangeRate()).toNumber();
  }

  // Note this returns nanos per ETH.
  getExchangeRateAfterFee(): BN {
    return new BN(this.parentComponent.nanosPerETHExchangeRate);
  }

  getWeiPerNanoExchangeRate(): BN {
    return toWei(new BN(1)).div(this.getExchangeRateAfterFee());
  }

  updateDESOToBuy(newVal: any): void {
    if (newVal == null || newVal === '') {
      this.desoToBuy = 0;
      this.ethToExchange = 0;
      this.weiToExchange = new BN(0);
    } else {
      // Convert the string value to a number
      this.desoToBuy = Number(this.desoToBuy);

      // Update the other value
      this.ethToExchange = this.computeETHToBurnGivenDESONanos(
        newVal * GlobalVarsService.NANOS_PER_UNIT
      );
      this.weiToExchange = this.computeWeiToBurnGivenDESONanos(
        newVal * GlobalVarsService.NANOS_PER_UNIT
      );
    }
  }

  updateETHToExchange(newVal: any): void {
    if (newVal == null || newVal === '') {
      this.desoToBuy = 0;
      this.ethToExchange = 0;
      this.weiToExchange = new BN(0);
    } else {
      // Convert the string value to a number
      this.weiToExchange = this.toWeiBN(newVal);
      this.ethToExchange = Number(newVal);
      // Update the other value
      this.desoToBuy =
        this.computeNanosToCreateGivenWeiToBurn(this.weiToExchange) /
        GlobalVarsService.NANOS_PER_UNIT;
    }
  }

  nodeFee(): number {
    return 1 + this.parentComponent.BuyDeSoFeeBasisPoints / (100 * 100);
  }

  refreshBalance(): void {
    if (!this.loadingBalance) {
      this.loadingBalance = true;
      this.getBalance(this.ethDepositAddress(), 'latest')
        .then((res) => {
          this.weiBalance = toBN(res);
          this.ethBalance = Number(fromWei(this.weiBalance));
        })
        .finally(() => {
          this.loadingBalance = false;
        });
    }
    if (!this.loadingFee) {
      this.loadingFee = true;
      this.getFees().then((res) => {
        this.weiFeeEstimate = this.getTotalFee(res);
        this.ethFeeEstimate = Number(fromWei(this.weiFeeEstimate));
        this.weiToExchange = this.weiFeeEstimate;
        this.ethToExchange = Number(fromWei(this.weiFeeEstimate));
      });
    }
  }

  queryETHRPC<Type>(method: string, params: any[]): Promise<Type> {
    return new Promise<Type>((resolve, reject) => {
      const jwt = this.signingService.signJWT(this.seedHex);
      this.backendAPIService
        .QueryETHRPC(method, params, this.publicKey, jwt)
        .toPromise()
        .then(
          (res: any) => {
            resolve(res.result);
          },
          (err: any) => {
            console.error(err);
            reject(err);
          }
        );
    });
  }

  // Get current gas price.
  getGasPrice(): Promise<Hex> {
    return this.queryETHRPC<Hex>('eth_gasPrice', []);
  }

  // Gets the data about the pending block.
  getBlock(block: string): Promise<any> {
    return this.queryETHRPC('eth_getBlockByNumber', [block, false]);
  }

  getTransactionCount(
    address: string,
    block: string = 'pending'
  ): Promise<number> {
    return this.queryETHRPC<Hex>('eth_getTransactionCount', [
      address,
      block,
    ]).then((result) => hexToNumber(result));
  }

  // Gets balance for address.
  getBalance(address: string, block: string = 'latest'): Promise<Hex> {
    return this.queryETHRPC<Hex>('eth_getBalance', [address, block]);
  }

  getMaxPriorityFeePerGas(): Promise<Hex> {
    return this.queryETHRPC<Hex>('eth_maxPriorityFeePerGas', []);
  }

  // getFees returns all the numbers and hex-strings necessary for computing eth gas.
  getFees(): Promise<FeeDetails> {
    return Promise.all([
      this.getBlock('pending'),
      this.getMaxPriorityFeePerGas(),
      this.getGasPrice(),
    ]).then(([block, maxPriorityFeePerGasHex, gasPriceHex]) => {
      const baseFeePerGas = toBN(block.baseFeePerGas);

      // Add a gwei to make this transaction more attractive to miners.
      const maxPriorityFeePerGas = toBN(maxPriorityFeePerGasHex).add(
        new BN(toWei('1', 'gwei'))
      );
      // Ensure transaction is marketable for the next 6 blocks. The base fee increase by 12.5% when the previos block
      // was 100% full. 1.125^6 = 2.0273
      // Source: https://www.blocknative.com/blog/eip-1559-fees
      const maxFeePerGas = baseFeePerGas.muln(2).add(maxPriorityFeePerGas);
      const totalFeesEIP1559 = maxFeePerGas.mul(
        BuyDeSoEthComponent.instructionsPerBasicTransfer
      );
      // In order to increase the priority of this transaction, we're willing to pay twice as much in gas.
      const gasPrice = toBN(gasPriceHex).muln(2);
      const totalFeesLegacy = gasPrice.mul(
        BuyDeSoEthComponent.instructionsPerBasicTransfer
      );
      if (BuyDeSoEthComponent.logFees) {
        console.log('gasPrice: ', fromWei(gasPrice, 'gwei'));
        console.log(
          'legacy total gas fees: ',
          fromWei(totalFeesLegacy, 'gwei')
        );
        console.log('maxFeePerGas: ', fromWei(maxFeePerGas, 'gwei'));
        console.log('baseFeePerGas: ', fromWei(baseFeePerGas, 'gwei'));
        console.log(
          'maxPriorityFeePerGas: ',
          fromWei(maxPriorityFeePerGas, 'gwei')
        );
        console.log(
          'EIP 1559 total gas fees: ',
          fromWei(totalFeesEIP1559, 'gwei')
        );
      }

      return {
        baseFeePerGas,
        maxPriorityFeePerGas,
        maxPriorityFeePerGasHex,
        maxFeePerGas,
        maxFeePerGasHex: toHex(maxFeePerGas),
        totalFeesEIP1559,
        gasPrice,
        gasPriceHex: toHex(gasPrice),
        totalFeesLegacy,
        maxLegacyGasPrice: maxFeePerGas.gt(gasPrice) ? maxFeePerGas : gasPrice,
        maxLegacyGasPriceHex: toHex(
          maxFeePerGas.gt(gasPrice) ? maxFeePerGas : gasPrice
        ),
        maxTotalFeesLegacy: totalFeesEIP1559.gt(totalFeesLegacy)
          ? totalFeesEIP1559
          : totalFeesLegacy,
      };
    });
  }

  getChain(): Chain {
    return this.globalVars.network === Network.testnet
      ? Chain.Ropsten
      : Chain.Mainnet;
  }

  getChainString(): string {
    return this.globalVars.network === Network.testnet ? 'ropsten' : 'mainnet';
  }

  getHardfork(): Hardfork {
    return BuyDeSoEthComponent.useLegacyTransaction
      ? Hardfork.Petersburg
      : Hardfork.London;
  }

  getHardforkString(): string {
    return BuyDeSoEthComponent.useLegacyTransaction ? 'petersburg' : 'london';
  }

  getOptions(): TxOptions {
    return { common: this.common };
  }

  getOldOptions(): TransactionOptions {
    return { chain: this.getChainString(), hardfork: this.getHardforkString() };
  }

  ngOnInit(): void {
    window.scroll(0, 0);

    this.common = new Common({
      chain: this.getChain(),
      hardfork: this.getHardfork(),
    });

    this.refreshBalance();

    // Force an update of the exchange rate when loading the Buy DESO page to ensure our computations are using the latest rates.
    this.parentComponent._updateDeSoExchangeRate();
  }

  stringToWeiBN(wei: string): BN {
    return new BN(toWei(wei));
  }

  toWeiBN(wei: number): BN {
    return this.stringToWeiBN(wei.toString());
  }
}

// @NgModule({
//   declarations: [BuyDeSoEthComponent],
//   imports: [
//     IconsModule,
//     MatTooltipModule,
//     FormsModule,
//     CommonModule,
//   ],
//   exports: [BuyDeSoEthComponent],
//   schemas: [CUSTOM_ELEMENTS_SCHEMA]
// })
// export class BuyDeSoEthComponentWrapper {}

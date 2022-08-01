import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import {
  BackendAPIService,
  TransactionSpendingLimitResponse,
} from '../backend-api.service';
import { LoginMethod, Network } from '../../types/identity';
import { ec } from 'elliptic';
import { CryptoService } from '../crypto.service';
import { getSpendingLimitsForMetamask } from '../log-in/log-in.component';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { SigningService } from '../signing.service';
import { MetamaskService } from '../metamask.service';
enum SCREEN {
  CREATE_ACCOUNT = 0,
  LOADING = 1,
  ACCOUNT_SUCCESS = 2,
  AUTHORIZE_MESSAGES = 3,
  MESSAGES_SUCCESS = 4,
}
enum METAMASK {
  START = 0,
  CONNECT = 1,
  ERROR = 2,
}
@Component({
  selector: 'app-sign-up-metamask',
  templateUrl: './sign-up-metamask.component.html',
  styleUrls: ['./sign-up-metamask.component.scss'],
})
export class SignUpMetamaskComponent implements OnInit {
  private static UNLIMITED_DERIVED_KEY_EXPIRATION: Readonly<number> = 100000000000;
  metamaskState: METAMASK = METAMASK.START;
  currentScreen: SCREEN = SCREEN.CREATE_ACCOUNT;
  timer: any;
  SCREEN = SCREEN;
  METAMASK = METAMASK;
  publicKey = '';
  errorMessage = '';

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private signingService: SigningService,
    private metamaskService: MetamaskService
  ) {}

  ngOnInit(): void {}

  nextStep(): void {
    this.currentScreen += 1;
  }

  launchMetamask(): void {
    this.errorMessage = '';
    this.metamaskState = this.METAMASK.CONNECT;
    this.signInWithMetamaskNewUser();
  }

  /**
   * Flow for new deso users looking to sign in with metamask
   */
  public async signInWithMetamaskNewUser(): Promise<any> {
    // generate a random derived key
    const network = this.globalVars.network;
    const expirationBlock =
      SignUpMetamaskComponent.UNLIMITED_DERIVED_KEY_EXPIRATION;
    const { keychain, mnemonic, derivedPublicKeyBase58Check, derivedKeyPair } =
      this.accountService.generateDerivedKey(network);

    this.metamaskState = METAMASK.CONNECT;
    try {
      await this.metamaskService.connectMetamaskMiddleware();
    } catch (e) {
      this.errorMessage = `Can\'t connect to the Metamask API. Error: ${e}. Please try again.`;
      this.metamaskState = METAMASK.ERROR;
      return;
    }
    // fetch a spending limit hex string based off of the permissions you're allowing
    const getAccessBytesResponse = await this.backendApi
      .GetAccessBytes(
        derivedPublicKeyBase58Check,
        expirationBlock,
        getSpendingLimitsForMetamask() as TransactionSpendingLimitResponse
      )
      .toPromise()
      .catch((e) => {
        this.errorMessage =
          'Problem getting transaction spending limit. Please try again.';
        this.metamaskState = METAMASK.ERROR;
        return;
      });
    if (!getAccessBytesResponse) {
      return;
    }

    // we can now generate the message and sign it.
    let message: number[];
    let signature: string;
    try {
      const resp =
        await this.metamaskService.signMessageWithMetamaskAndGetEthAddress(
          getAccessBytesResponse.AccessBytesHex
        );
      message = resp.message;
      signature = resp.signature;
    } catch (e) {
      this.errorMessage =
        'Something went wrong while producing Metamask signature. Please try again.';
      this.metamaskState = METAMASK.ERROR;
      return;
    }

    // once we have the signature we can fetch the public key from it
    const metamaskKeyPair = this.getMetaMaskMasterPublicKeyFromSignature(
      signature,
      message
    );

    const metamaskPublicKey = Buffer.from(
      metamaskKeyPair.getPublic().encode('array', true)
    );

    const metamaskPublicKeyHex = metamaskPublicKey.toString('hex');
    const metamaskBtcAddress = this.cryptoService.publicKeyToBtcAddress(
      metamaskPublicKey,
      Network.mainnet
    );

    const metamaskEthAddress =
      this.cryptoService.publicKeyToEthAddress(metamaskKeyPair);
    const metamaskPublicKeyBase58Check =
      this.cryptoService.publicKeyToDeSoPublicKey(metamaskKeyPair, network);
    try {
      await this.backendApi
        .SendStarterDeSoForMetamaskAccount({
          Signer: metamaskKeyPair.getPublic().encode('array', true),
          AmountNanos: 1000,
          Message: message,
          Signature: [
            ...Buffer.from(signature.slice(2, signature.length), 'hex'),
          ],
        })
        .toPromise();
    } catch (e) {
      const err = (e as any)?.error?.error;
      this.errorMessage =
        err ||
        'Unable to send starter Deso, this is not an issue if you already have a Deso balance';
      this.metamaskState = METAMASK.ERROR;
      return;
    }
    // Slice the '0x' prefix from the signature.
    const accessSignature = signature.slice(2);
    // we now have all the arguments to generate an authorize derived key transaction
    let authorizeDerivedKeyResponse: any;
    try {
      authorizeDerivedKeyResponse = await this.backendApi
        .AuthorizeDerivedKey(
          metamaskPublicKeyBase58Check,
          derivedPublicKeyBase58Check,
          expirationBlock,
          accessSignature,
          getAccessBytesResponse.SpendingLimitHex
        )
        .toPromise();
    } catch (e) {
      this.errorMessage = 'problem authorizing derived key, please try again';
      this.metamaskState = METAMASK.ERROR;
      return;
    }
    // Sanity-check the transaction contains all the information we passed.
    if (
      !this.accountService.verifyAuthorizeDerivedKeyTransaction(
        authorizeDerivedKeyResponse.TransactionHex,
        derivedKeyPair,
        expirationBlock,
        accessSignature
      )
    ) {
      this.errorMessage =
        'Problem verifying authorized derived key transaction metadata';
      this.metamaskState = METAMASK.ERROR;
      return;
    }
    // convert it to a byte array, sign it, submit it
    const signedTransactionHex = this.signingService.signTransaction(
      derivedKeyPair.getPrivate().toString('hex'),
      authorizeDerivedKeyResponse.TransactionHex,
      true
    );

    this.backendApi
      .SubmitTransaction(signedTransactionHex)
      .toPromise()
      .then((res) => {
        this.publicKey = this.accountService.addUserWithDepositAddresses(
          keychain,
          mnemonic,
          '',
          this.globalVars.network,
          metamaskBtcAddress,
          metamaskEthAddress,
          LoginMethod.METAMASK,
          metamaskPublicKeyHex
        );
        this.currentScreen = this.SCREEN.ACCOUNT_SUCCESS;
        this.metamaskState = this.METAMASK.START;
        // this.startTimer();
      })
      .catch((e) => {
        this.errorMessage =
          'Problem communicating with the blockchain. Please Try again.';
        this.metamaskState = METAMASK.ERROR;
      });
  }

  /**
   *
   * @param signature a signature from the metamask account that we can extract the public key from
   * @param message the raw message that's included in the signature, needed to pull out the public key
   * @returns
   * extracts the public key from a signature and then encodes it to base58 aka a deso public key
   */
  public getMetaMaskMasterPublicKeyFromSignature(
    signature: string,
    message: number[]
  ): ec.KeyPair {
    const e = new ec('secp256k1');
    const arrayify = ethers.utils.arrayify;
    const messageHash = arrayify(ethers.utils.hashMessage(message));
    const publicKeyUncompressedHexWith0x = ethers.utils.recoverPublicKey(
      messageHash,
      signature
    );
    const metamaskPublicKey = e.keyFromPublic(
      publicKeyUncompressedHexWith0x.slice(2),
      'hex'
    );
    return metamaskPublicKey;
  }

  public login(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKey,
      signedUp: false,
    });
  }
}

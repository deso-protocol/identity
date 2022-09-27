import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import {
  BackendAPIService,
  TransactionSpendingLimitResponse,
} from '../backend-api.service';
import { LoginMethod, Network } from '../../types/identity';
import { ec } from 'elliptic';
import { CryptoService } from '../crypto.service';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';
import { GlobalVarsService } from '../global-vars.service';
import { SigningService } from '../signing.service';
import { MetamaskService } from '../metamask.service';
import { RouteNames } from '../app-routing.module';
import { Router } from '@angular/router';

export const getSpendingLimitsForMetamask = () => {
  return {
    IsUnlimited: true,
  };
};
enum SCREEN {
  CREATE_ACCOUNT = 0,
  LOADING = 1,
  AUTHORIZE_MESSAGES = 3,
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
  existingConnectedWallet = '';
  showAlternative = false;
  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private signingService: SigningService,
    private metamaskService: MetamaskService,
    private router: Router,
  ) {}
  async ngOnInit(): Promise<void> {
    if (this.globalVars.isMobile()) {
      await this.metamaskService.connectWallet();
    }
    // grab the currently connected wallet if there is one
    this.existingConnectedWallet =
      await this.metamaskService.getUserEthAddress();
    // if they change wallets then update the display
    this.metamaskService.onSignerChange((updatedAccount: string) => {
      this.existingConnectedWallet = updatedAccount;
    });
  }

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
      await this.metamaskService.connectWallet();
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
      this.errorMessage = `Something went wrong while producing Metamask signature. Please try again. Error: ${e}`;
      this.metamaskState = METAMASK.ERROR;
      return;
    }

    // once we have the signature we can fetch the public key from it
    const metamaskKeyPair =
      this.metamaskService.getMetaMaskMasterPublicKeyFromSignature(
        signature,
        message
      );

    const metamaskPublicKey = Buffer.from(
      metamaskKeyPair.getPublic().encode('array', true)
    );

    const metamaskPublicKeyHex = metamaskPublicKey.toString('hex');
    const metamaskBtcAddress = this.cryptoService.publicKeyToBtcAddress(
      Buffer.from(derivedKeyPair.getPublic().encode('array', true)),
      this.globalVars.network
    );

    const metamaskEthAddress =
      this.cryptoService.publicKeyToEthAddress(derivedKeyPair);
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
      // if they received the account, or if they have funds don't error out of the flow,
      //  just move on to the next step
      let errorMessage = (e as any)?.error?.error;
      if (
        ![
          'MetamaskSignin: Account already has a balance',
          'MetamaskSignin: Account has already received airdrop',
        ].includes(errorMessage)
      ) {
        if (
          errorMessage.match(
            'MetamaskSignin: To be eligible for airdrop your account needs to have more than'
          )
        ) {
          this.showAlternative = true;
          this.errorMessage =
            'Bummer! We send airdrops to cover the tiny account creation fees on DeSo, and you need at least ' +
            '0.001 ETH in your MetaMask wallet to be eligible. We do this to prevent bots.';
        } else {
          errorMessage =
            errorMessage ||
            'Unable to send starter Deso, this is not an issue if you already have a DESO balance';
        }
        this.metamaskState = METAMASK.ERROR;
        return;
      }
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
          getAccessBytesResponse.TransactionSpendingLimitHex
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
          metamaskPublicKeyHex,
          derivedPublicKeyBase58Check
        );

        this.accountService.setIsMetamaskAndDerived(derivedPublicKeyBase58Check);
        this.metamaskState = this.METAMASK.START;
        this.login();
      })
      .catch((e) => {
        this.errorMessage =
          'Problem communicating with the blockchain. Please Try again.';
        this.metamaskState = METAMASK.ERROR;
      });
  }

  public redirectToLogIn(): void {
    this.router.navigate(['/', RouteNames.LOG_IN], {
      queryParamsHandling: 'merge',
    });
  }

  public login(): void {
    this.accountService.setAccessLevel(
      this.publicKey,
      this.globalVars.hostname,
      this.globalVars.accessLevelRequest
    );
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKey,
      signedUp: true,
    });
  }
}

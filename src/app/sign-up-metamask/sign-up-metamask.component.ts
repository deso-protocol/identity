import { Component, OnInit } from '@angular/core';
import {ethers} from 'ethers';
import {BackendAPIService, TransactionSpendingLimitResponse} from '../backend-api.service';
import {Network} from '../../types/identity';
import HDKey from 'hdkey';
import {ec} from 'elliptic';
import {CryptoService} from '../crypto.service';
import * as bs58check from 'bs58check';
import {getSpendingLimitsForMetamask} from '../log-in/log-in.component';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {EntropyService} from '../entropy.service';
import {GoogleDriveService} from '../google-drive.service';
import {GlobalVarsService} from '../global-vars.service';
import {SigningService} from '../signing.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-sign-up-metamask',
  templateUrl: './sign-up-metamask.component.html',
  styleUrls: ['./sign-up-metamask.component.scss']
})
export class SignUpMetamaskComponent implements OnInit {
  static UNLIMITED_DERIVED_KEY_EXPIRATION = 999999999999;

  SCREEN_CREATE_ACCOUNT = 0;
  SCREEN_LOADING = 1;
  SCREEN_ACCOUNT_SUCCESS = 2;
  SCREEN_AUTHORIZE_MESSAGES = 3;
  SCREEN_MESSAGES_SUCCESS = 4;
  currentScreen = this.SCREEN_CREATE_ACCOUNT;

  stopTimeout = false;
  timeoutTimer = 5;
  publicKey = '';

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private signingService: SigningService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.computeTimeout = this.computeTimeout.bind(this);
  }

  nextStep(): void {
    this.currentScreen += 1;
  }

  /**
   * STEP SCREEN_CREATE_ACCOUNT
   */

  launchMetamask(): void {
    this.signInWithMetamaskNewUser();
  }

  public connectMetamaskMiddleware(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.getProvider()
        .listAccounts()
        .then((accounts) => {
          if (accounts.length === 0) {
            this.getProvider()
              .send('eth_requestAccounts', [])
              .then((res) => {
                // Metamask successfully connected.
                resolve(res);
              })
              .catch((err) => {
                // EIP-1193 userRejectedRequest error.
                if (err.code === 4001) {
                  console.error(
                    'user rejected the eth_requestAccounts request'
                  );
                } else {
                  console.error(
                    'error while sending eth_requestAccounts:',
                    err
                  );
                }
                reject(err);
              });
          } else {
            resolve(true);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  public verifySignatureAndRecoverAddress(
    message: number[],
    signature: string
  ): Promise<any> {
    const arrayify = ethers.utils.arrayify;
    const hash = ethers.utils.hashMessage;
    const recoveredAddress = ethers.utils.recoverAddress(
      arrayify(hash(message)),
      signature
    );
    return new Promise<any>((resolve, reject) => {
      this.getProvider()
        .getSigner()
        .getAddress()
        .then((publicEthAddress) => {
          if (recoveredAddress !== publicEthAddress) {
            reject(
              'Public key recovered from signature doesn\'t match the signer\'s public key!'
            );
          } else {
            resolve(recoveredAddress);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * Flow for new deso users looking to sign in with metamask
   */
  public signInWithMetamaskNewUser(): any {
    // generate a random derived key
    const network = this.globalVars.network;
    const expirationBlock = SignUpMetamaskComponent.UNLIMITED_DERIVED_KEY_EXPIRATION;
    const { keychain, mnemonic, derivedPublicKeyBase58Check, derivedKeyPair } =
      this.generateDerivedKey(network);
    this.connectMetamaskMiddleware()
      .then(() => {
        // fetch a spending limit hex string based off of the permissions you're allowing
        this.backendApi
          .GetAccessBytes(
            derivedPublicKeyBase58Check,
            expirationBlock,
            getSpendingLimitsForMetamask() as TransactionSpendingLimitResponse
          )
          .toPromise()
          .then((getAccessBytesResponse) => {
            //  we can now generate the message and sign it
            this.generateMessageAndSignature(
              derivedKeyPair,
              getAccessBytesResponse.AccessBytesHex
            ).then(({ message, signature }) => {
              this.currentScreen = this.SCREEN_LOADING;
              this.verifySignatureAndRecoverAddress(message, signature).then(
                (publicEthAddress) => {
                  // TODO: this needs backend's gringotts endpoint implemented.
                  this.getFundsForNewUsers(signature, message, publicEthAddress)
                    .then(() => {
                      // once we have the signature we can fetch the public key from it
                      const metamaskKeyPair = this.getMetaMaskMasterPublicKeyFromSignature(signature, message);
                      const metamaskPublicKey = Buffer.from(metamaskKeyPair.getPublic().encode('array', true));
                      const metamaskPublicKeyHex = metamaskPublicKey.toString('hex');
                      const metamaskBtcAddress = this.cryptoService.publicKeyToBtcAddress(metamaskPublicKey, Network.mainnet);
                      const metamaskEthAddress = this.cryptoService.publicKeyToEthAddress(metamaskKeyPair);
                      const metamaskPublicKeyDeso = this.cryptoService.publicKeyToDeSoPublicKey(metamaskKeyPair, network);
                      // Slice the '0x' prefix from the signature.
                      const accessSignature = signature.slice(2);

                      // we now have all the arguments to generate an authorize derived key transaction
                      this.backendApi
                        .AuthorizeDerivedKey(
                          metamaskPublicKeyDeso,
                          derivedPublicKeyBase58Check,
                          expirationBlock,
                          accessSignature,
                          getAccessBytesResponse.SpendingLimitHex
                        )
                        .toPromise()
                        .then((response) => {
                          // convert it to a byte array, sign it, submit it
                          const signedTransactionHex =
                            this.signingService.signTransaction(
                              derivedKeyPair.getPrivate().toString('hex'),
                              response.TransactionHex,
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
                                false,
                                metamaskPublicKeyHex
                              );
                              this.currentScreen = this.SCREEN_ACCOUNT_SUCCESS;
                              this.computeTimeout();
                            })
                            .catch((err) => {
                              console.error('error', err);
                            });
                        })
                        .catch((err) => {
                          console.error(err);
                        });
                    })
                    .catch((err) => {
                      console.error(err);
                    });
                }
              );
            });
          });
      })
      .catch((err) => {
        console.error('error connecting Metamask:', err);
      });
  }

  /**
   * @returns derivedPublicKeyBase58Check Base58 encoded derived public key
   * @returns derivedKeyPairKey pair object that handles the public private key logic for the derived key
   * Generates a new derived key
   */
  private generateDerivedKey(network: Network): {
    keychain: HDKey;
    mnemonic: string;
    derivedPublicKeyBase58Check: string;
    derivedKeyPair: ec.KeyPair;
  } {
    const e = new ec('secp256k1');
    this.entropyService.setNewTemporaryEntropy();
    const mnemonic = this.entropyService.temporaryEntropy.mnemonic;
    const keychain = this.cryptoService.mnemonicToKeychain(mnemonic);
    const prefix = CryptoService.PUBLIC_KEY_PREFIXES[network].deso;
    const derivedKeyPair = e.keyFromPrivate(keychain.privateKey); // gives us the keypair
    const desoKey = derivedKeyPair.getPublic().encode('array', true);
    const prefixAndKey = Uint8Array.from([...prefix, ...desoKey]);
    const derivedPublicKeyBase58Check = bs58check.encode(prefixAndKey);
    return {
      keychain,
      mnemonic,
      derivedPublicKeyBase58Check,
      derivedKeyPair,
    };
  }

  /**
   *
   * @param derivedKeyPair Key pair object that handles the public private key logic
   * @param spendingLimits determines what the derived key will be able to do for the user
   * @returns message: a byte array representation of the public key, expiration block for the derived key, and spending limits
   * @returns signature: the signed message by the derivedKeyPair object
   * generates a spending limits message and signature for authorizing a derived key
   */
  private generateMessageAndSignature(
    derivedKeyPair: ec.KeyPair,
    accessBytesHex: string
  ): Promise<{ message: number[]; signature: string }> {
    const numBlocksBeforeExpiration = 999999999999;

    // Access Bytes Encoding 1.0
    /*
        const derivedMessage = [
          ...ethers.utils.toUtf8Bytes(
            derivedKeyPair.getPublic().encode('hex', true)
          ),
          ...ethers.utils.toUtf8Bytes(
            uint64ToBufBigEndian(numBlocksBeforeExpiration).toString('hex')
          ),
          ...ethers.utils.toUtf8Bytes(spendingLimits),
        ];
    */

    // Access Bytes Encoding 2.0
    const message = [...Buffer.from(accessBytesHex, 'hex')];
    return new Promise<{ message: number[]; signature: string }>(
      (resolve, reject) => {
        this.getProvider()
          .getSigner()
          .signMessage(message)
          .then((signature) => {
            resolve({ message, signature });
          })
          .catch((err) => {
            reject(err);
          });
      }
    );
  }

  private getProvider = (): ethers.providers.Web3Provider => {
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    return provider;
  }

  public getFundsForNewUsers(
    signature: string,
    message: number[],
    publicAddress: string
  ): Promise<any> {
    // TODO: this needs to be added later
    return new Promise<any>((resolve, reject) => {
      resolve(true);
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

  /**
   * STEP SCREEN_LOADING
   */
  private computeTimeout(): void {
    console.log("got here");
    if (this.stopTimeout) {
      return;
    }

    if (this.timeoutTimer <= 0) {
      this.login();
      return;
    }

    this.timeoutTimer--;
    setTimeout(this.computeTimeout, 1000);
  }

  public login(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKey,
      signedUp: false,
    });
  }

  /**
   * STEP SCREEN_ACCOUNT_SUCCESS
   */

  public stopTimer(): void {
    this.stopTimeout = true;
    this.timeoutTimer = 5;
  }

  /**
   * STEP SCREEN_AUTHORIZE_MESSAGES
   */

  /**
   * STEP SCREEN_MESSAGES_SUCCESS
   */

}

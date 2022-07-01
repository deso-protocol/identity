import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {BackendAPIService, TransactionSpendingLimitResponse} from '../backend-api.service';
import {Network, PrivateUserVersion, UserProfile} from '../../types/identity';
import {CryptoService} from '../crypto.service';
import {EntropyService} from '../entropy.service';
import {GoogleDriveService} from '../google-drive.service';
import {RouteNames} from '../app-routing.module';
import {Router} from '@angular/router';
import {ec} from 'elliptic';
import {ethers} from 'ethers';
import * as bs58check from 'bs58check';
import {uint64ToBufBigEndian, uvarint64ToBuf} from '../../lib/bindata/util';
import * as sha256 from 'sha256';
import {SigningService} from '../signing.service';
import HDKey from 'hdkey';

@Component({
  selector: 'app-log-in',
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss']
})
export class LogInComponent implements OnInit {
  static UNLIMITED_DERIVED_KEY_EXPIRATION = 999999999999;

  loading = false;
  showAccessLevels = true;

  allUsers: {[key: string]: UserProfile} = {};
  hasUsers = false;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private cryptoService: CryptoService,
    private entropyService: EntropyService,
    private googleDrive: GoogleDriveService,
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private signingService: SigningService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    // Set showAccessLevels
    this.showAccessLevels = !this.globalVars.isFullAccessHostname();
  }

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  selectAccount(publicKey: string): void {
    this.accountService.setAccessLevel(publicKey, this.globalVars.hostname, this.globalVars.accessLevelRequest);
    if (!this.globalVars.getFreeDeso) {
      this.login(publicKey);
    } else {
      this.backendApi.GetUsersStateless(
        [publicKey],
        true,
        true,
        true
      ).subscribe((res) => {
        if (!res?.UserList.length || res.UserList[0].BalanceNanos === 0) {
          this.navigateToGetDeso(publicKey);
        } else {
          this.login(publicKey);
        }
      }, (err) => {
        console.error(err);
        this.navigateToGetDeso(publicKey);
      });
    }
  }

  navigateToGetDeso(publicKey: string): void {
    this.router.navigate(['/', RouteNames.GET_DESO], { queryParamsHandling: 'merge', queryParams: { publicKey } });
  }

  login(publicKey: string): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: publicKey,
      signedUp: false
    });
  }

  /*
  METAMASK
   */

  launchMetamask(): void {
    this.signInWithMetamaskNewUser();
  }

  public connectMetamaskMiddleware(): Promise<any> {
    return new Promise<any>( (resolve, reject) => {
      this.getProvider().listAccounts().then(
        accounts => {
          if (accounts.length === 0) {
            this.getProvider().send('eth_requestAccounts', [])
              .then( res => {
                // Metamask successfully connected.
                resolve(res);
              })
              .catch( err => {
                // EIP-1193 userRejectedRequest error.
                if (err.code === 4001) {
                  console.error('user rejected the eth_requestAccounts request');
                } else {
                  console.error('error while sending eth_requestAccounts:', err);
                }
                reject(err);
              });
          } else {
            resolve(true);
          }
        }
      ).catch(
        err => {
          reject(err);
        }
      );
    });
  }

  public verifySignatureAndRecoverAddress(message: number[], signature: string): Promise<any> {
    const arrayify = ethers.utils.arrayify;
    const hash = ethers.utils.hashMessage;
    const recoveredAddress = ethers.utils.recoverAddress(arrayify(hash(message)), signature);
    return new Promise<any>( (resolve, reject) => {
      this.getProvider().getSigner().getAddress()
        .then( publicEthAddress => {
          if (recoveredAddress !== publicEthAddress) {
            reject('Public key recovered from signature doesn\'t match the signer\'s public key!');
          } else {
            resolve(recoveredAddress);
          }
        })
        .catch( err => {
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
    const expirationBlock = LogInComponent.UNLIMITED_DERIVED_KEY_EXPIRATION;
    const { keychain, mnemonic, derivedPublicKeyBase58Check, derivedKeyPair } = this.generateDerivedKey(network);
    this.connectMetamaskMiddleware()
      .then( () => {
        // fetch a spending limit hex string based off of the permissions you're allowing
        this.backendApi.GetAccessBytes(
          derivedPublicKeyBase58Check,
          expirationBlock,
          getSpendingLimitsForMetamask() as TransactionSpendingLimitResponse
        ).toPromise().then( (getAccessBytesResponse) => {
          //  we can now generate the message and sign it
          this.generateMessageAndSignature(
            derivedKeyPair,
            getAccessBytesResponse.AccessBytesHex
          ).then( ({message, signature}) => {
            this.verifySignatureAndRecoverAddress(message, signature)
              .then( publicEthAddress => {
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
                    this.backendApi.AuthorizeDerivedKey(
                      metamaskPublicKeyDeso,
                      derivedPublicKeyBase58Check,
                      expirationBlock,
                      accessSignature,
                      getAccessBytesResponse.SpendingLimitHex
                    ).toPromise()
                      .then( response => {
                        // convert it to a byte array, sign it, submit it
                        const signedTransactionHex = this.signingService.signTransaction(
                          derivedKeyPair.getPrivate().toString('hex'),
                          response.TransactionHex);
                        this.backendApi.SubmitTransaction(signedTransactionHex).toPromise()
                          .then( res => {
                            this.accountService.addUserWithDepositAddresses(
                              keychain,
                              mnemonic,
                              '',
                              this.globalVars.network,
                              metamaskBtcAddress,
                              metamaskEthAddress,
                              false,
                              metamaskPublicKeyHex,
                            );
                          })
                          .catch( err => {
                            console.error('error', err);
                          });
                      })
                      .catch( err => {
                        console.error(err);
                      });
                })
                .catch( err => {
                  console.error(err);
              });
            });
          });
        });
      })
      .catch( err => {
        console.error('error connecting Metamask:', err);
      });
  }

  /**
   * @returns derivedPublicKeyBase58Check Base58 encoded derived public key
   * @returns derivedKeyPairKey pair object that handles the public private key logic for the derived key
   * Generates a new derived key
   */
  private generateDerivedKey(network: Network): {
    keychain: HDKey,
    mnemonic: string,
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
      derivedKeyPair
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
    accessBytesHex: string,
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

    // Access Bytes Encoding 2.0-
    const message = [... Buffer.from(accessBytesHex, 'hex')];
    return new Promise<{ message: number[]; signature: string }>((resolve, reject) => {
      this.getProvider().getSigner().signMessage(message)
        .then( signature => {
          resolve({message, signature});
        })
        .catch( err => {
          reject(err);
        });
    });
    // return { message: [...ethers.utils.toUtf8Bytes(message)], signature };
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
    return new Promise<any>((resolve, reject) => {resolve(true); });
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
}

export const getSpendingLimitsForMetamask = (): any => {
  return {
    GlobalDESOLimit: 1000000000,
    TransactionCountLimitMap: {
      SUBMIT_POST: 120000,
      UPDATE_PROFILE: 120000,
      AUTHORIZE_DERIVED_KEY: 120000,
    },
  };
};


import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { GlobalVarsService } from './global-vars.service';
import NodeWalletConnect from '@walletconnect/node';
import WalletConnectQRCodeModal from '@walletconnect/qrcode-modal';
import { ec } from 'elliptic';
import { WindowPostMessageStream } from '@metamask/post-message-stream';
import { initializeProvider } from '@metamask/providers';

@Injectable({
  providedIn: 'root',
})
export class MetamaskService {
  walletProvider: WalletProvider;
  constructor(private globalVars: GlobalVarsService) {
    this.walletProvider = new WalletProvider(globalVars);
    if ((window as any).ethereum || (window as any).web3) {
      return;
    }
    if (navigator.userAgent.includes('Firefox')) {
      // setup background connection
      const metamaskStream = new WindowPostMessageStream({
        name: 'metamask-inpage',
        target: 'metamask-contentscript',
      }) as any;

      // this will initialize the provider and set it as window.ethereum
      initializeProvider({
        connectionStream: metamaskStream,
        shouldShimWeb3: true,
      });
    }
  }

  public connectWallet(): Promise<void> {
    return this.walletProvider.connectWallet();
  }
  public connectMetamaskMiddleware(): Promise<boolean> {
    return this.walletProvider.connectMetamaskMiddleware();
  }

  /**
   *
   * @param accessBytesHex determines what the derived key will be able to do for the user
   * @returns message: a byte array representation of the public key, expiration block for the derived key, and spending limits
   * @returns signature: the signed message by the derivedKeyPair object
   * generates a spending limits message and signature for authorizing a derived key
   */
  public async signMessageWithMetamaskAndGetEthAddress(
    accessBytesHex: string
  ): Promise<{
    message: number[];
    signature: string;
    publicEthAddress: string;
  }> {
    try {
      await this.connectMetamaskMiddleware();
    } catch (e) {
      throw e;
    }

    // Access Bytes Encoding 2.0
    const message = [...Buffer.from(accessBytesHex, 'hex')];
    return new Promise<{
      message: number[];
      signature: string;
      publicEthAddress: string;
    }>((resolve, reject) => {

      this.walletProvider
        .signMessage(message)
        .then(async (signature) => {
          try {
            const publicEthAddress =
              await this.verifySignatureAndRecoverAddress(message, signature);
            resolve({message, signature, publicEthAddress});
          } catch (e) {
            reject(`signature error: ${e}`);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  public async verifySignatureAndRecoverAddress(
    message: number[],
    signature: string
  ): Promise<string> {
    try {
      await this.connectMetamaskMiddleware();
    } catch (e) {
      throw e;
    }

    const arrayify = ethers.utils.arrayify;
    const hash = ethers.utils.hashMessage;
    const recoveredAddress = ethers.utils.recoverAddress(
      arrayify(hash(message)),
      signature
    );
    const publicEthAddress = await this.walletProvider.getUserEthAddress();
    if (recoveredAddress.toUpperCase() !== publicEthAddress.toUpperCase()) {
      throw new Error(
        "Public key recovered from signature doesn't match the signer's public key!"
      );
    }
    return recoveredAddress;
  }
  public async getUserEthAddress(): Promise<string> {
    const publicEthAddress = await this.walletProvider.getUserEthAddress();
    return publicEthAddress;
  }
  /**
   * Event listener for when a user switches their connected account
   * @param addressToDisplay address in template to update when the signer changes
   */
  public onSignerChange(callback: (updatedAccount: string) => void): void {
    (window as any).ethereum.on(
      'accountsChanged',
      function (accounts: string[]) {
        callback(accounts[0]);
      }
    );
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

export class WalletProvider {
  walletConnect: NodeWalletConnect | null = null;
  walletConnectAddress: string | null = null;

  constructor(
    private globalVars: GlobalVarsService,
  ) {}

  private _isInitialized(): boolean {
    return this.walletConnect !== null;
  }

  private _getEthersProvider(): ethers.providers.Web3Provider {
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }

  private _setupWalletConnect(): void {
    if (this._isInitialized()) {
      return;
    }

    this.walletConnect = new NodeWalletConnect(
      {
        bridge: 'https://bridge.walletconnect.org', // Required
      },
      {
        clientMeta: {
          description: 'WalletConnect NodeJS Client',
          url: 'https://nodejs.org/en/',
          icons: ['https://nodejs.org/static/images/logo.svg'],
          name: 'WalletConnect',
        },
      }
    );

    // Subscribe to connection events
    this.walletConnect.on('connect', (error: any, payload: any) => {
      if (error) {
        throw error;
      }

      // Close QR Code Modal
      WalletConnectQRCodeModal.close();

      // Get provided accounts and chainId
      const { accounts, chainId } = payload.params[0];
      if (accounts.length > 0) {
        this.walletConnectAddress = accounts[0];
      }
    });

    this.walletConnect.on('session_update', (error: any, payload: any) => {
      if (error) {
        throw error;
      }

      // Get updated accounts and chainId
      const { accounts, chainId } = payload.params[0];
      if (accounts.length > 0) {
        this.walletConnectAddress = accounts[0];
      }
    });

    this.walletConnect.on('disconnect', (error: any, payload: any) => {
      if (error) {
        throw error;
      }

      // Delete walletConnector
      this.walletConnect = null;
      this.walletConnectAddress = null;
    });
  }

  async connectWallet(): Promise<void> {
    if (this.globalVars.isMobile()) {
      // Create a connector
      this._setupWalletConnect();
      await this.connectMetamaskMiddleware();
    } else {
      const accounts = await this.listAccounts();
      if (accounts.length === 0) {
        await this.connectMetamaskMiddleware();
      } else {
        await this
          .send('wallet_requestPermissions', [
            {
              eth_accounts: {},
            },
          ])
          .catch((err) => {
            if (err.code === 4001) {
              throw new Error('user rejected the eth_requestPermissions');
            } else {
              throw new Error(
                `error while sending eth_requestPermissions: ${err}`
              );
            }
          });
      }
    }
  }

  async connectMetamaskMiddleware(): Promise<boolean> {
    if (this.globalVars.isMobile()) {
      // Create a connector
      this._setupWalletConnect();
      if (!(this.walletConnect as NodeWalletConnect).connected) {
        // create new session
        await (this.walletConnect as NodeWalletConnect).createSession();
        // get uri for QR Code modal
        const uri = (this.walletConnect as NodeWalletConnect).uri;
        // display QR Code modal
        WalletConnectQRCodeModal.open(
          uri,
          () => {},
          {
            mobileLinks: ['metamask'],
          }
        );
      } else {
        if ((this.walletConnect as NodeWalletConnect).accounts.length > 0) {
          this.walletConnectAddress = (this.walletConnect as NodeWalletConnect).accounts[0];
        }
      }
    } else {
      const accounts = await this.listAccounts();
      if (accounts.length === 0) {
        await this
          .send('eth_requestAccounts', [])
          .then()
          .catch((err) => {
            // EIP-1193 userRejectedRequest error.
            if (err.code === 4001) {
              throw new Error('user rejected the eth_requestAccounts request');
            } else {
              throw new Error(`error while sending eth_requestAccounts: ${err}`);
            }
          });
      }
    }
    return true;
  }

  listAccounts(): Promise<string[]> {
    if (this.globalVars.isMobile()) {
      throw new Error('send not supported on mobile');
    }

    return this._getEthersProvider().listAccounts();
  }

  send(method: string, params: any[]): Promise<any> {
    if (this.globalVars.isMobile()) {
      throw new Error('send not supported on mobile');
    }

    return this._getEthersProvider().send(method, params);
  }

  signMessage(message: number[]): Promise<string> {
    if (this.globalVars.isMobile()) {
      // Draft Message Parameters

      const msgParams = [
        this.walletConnectAddress,
        Buffer.from(message).toString('hex')
      ];

      // Sign message
      return (this.walletConnect as NodeWalletConnect)
        .signPersonalMessage(msgParams);
    } else {
      return this._getEthersProvider().getSigner().signMessage(message);
    }
  }

  getUserEthAddress(): Promise<string> {
    if (this.globalVars.isMobile()) {
      return new Promise((resolve, reject) => {
        if (this.walletConnectAddress !== null) {
          resolve(this.walletConnectAddress as string);
        } else {
          reject('no wallet connected');
        }
      });
    } else {
      return this._getEthersProvider().getSigner().getAddress();
    }
  }
}

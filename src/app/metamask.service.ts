import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import {ec} from 'elliptic';

@Injectable({
  providedIn: 'root',
})
export class MetamaskService {
  constructor() {}
  public async connectWallet(): Promise<void> {
    const accounts = await this.getProvider().listAccounts();
    if (accounts.length === 0) {
      await this.connectMetamaskMiddleware();
    } else {
      await this.getProvider()
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
  public async connectMetamaskMiddleware(): Promise<boolean> {
    const accounts = await this.getProvider().listAccounts();

    if (accounts.length === 0) {
      await this.getProvider()
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
    return true;
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
      this.getProvider()
        .getSigner()
        .signMessage(message)
        .then(async (signature) => {
          try {
            const publicEthAddress =
              await this.verifySignatureAndRecoverAddress(message, signature);
            resolve({ message, signature, publicEthAddress });
          } catch (e) {
            reject(`signature error: ${e}`);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  private getProvider = (): ethers.providers.Web3Provider => {
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum
    );
    return provider;
  };

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
    const publicEthAddress = await this.getProvider().getSigner().getAddress();
    if (recoveredAddress !== publicEthAddress) {
      throw new Error(
        "Public key recovered from signature doesn't match the signer's public key!"
      );
    }
    return recoveredAddress;
  }
  public async getSignerAddress(): Promise<string> {
    const publicEthAddress = await this.getProvider().getSigner().getAddress();
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

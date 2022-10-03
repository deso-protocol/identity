import { Injectable } from '@angular/core';
import { Observable, of, Subject, zip } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { AccessLevel, PublicUserInfo } from '../types/identity';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';
import { CookieService } from 'ngx-cookie';
import { SigningService } from './signing.service';
import { HttpParams } from '@angular/common/http';
import {
  BackendAPIService,
  TransactionSpendingLimitResponse,
} from './backend-api.service';
import {
  AccountService, ERROR_GETTING_MESSAGING_KEY_FOR_SEED_AFTER_COOKIE_FOUND,
  ERROR_NO_ENCRYPTED_MESSAGING_RANDOMNESS_COOKIE,
  ERROR_NO_MESSAGING_KEY_RANDOMNESS_FOUND,
  ERROR_USER_AND_COOKIE_NOT_FOUND,
  ERROR_USER_NOT_FOUND
} from './account.service';
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
  TransactionMetadataNFTTransfer,
  TransactionMetadataAcceptNFTTransfer,
  TransactionMetadataBurnNFT,
  TransactionMetadataAuthorizeDerivedKey,
  TransactionMetadataNFTBid,
  TransactionMetadataAcceptNFTBid,
  TransactionMetadataUpdateNFT,
  TransactionMetadataCreateNFT,
  TransactionMetadataDAOCoin,
  TransactionMetadataTransferDAOCoin,
  TransactionMetadataDAOCoinLimitOrder,
} from '../lib/deso/transaction';

export type DerivePayload = {
  publicKey: string;
  derivedPublicKey?: string;
  transactionSpendingLimit?: TransactionSpendingLimitResponse;
  expirationDays?: number;
};

export type MessagingGroupPayload = {
  messagingKeySignature: string;
  encryptedToApplicationGroupMessagingPrivateKey: string;
  encryptedToMembersGroupMessagingPrivateKey: string[];
  messagingPublicKeyBase58Check: string;
};

export type MessagingGroup = {
  EncryptedKey: string;
  ExtraData: null | { [k: string]: string };
  GroupOwnerPublicKeyBase58Check: string;
  MessagingGroupKeyName: string;
  MessagingGroupMembers: MessagingGroupMember[];
  MessagingPublicKeyBase58Check: string;
};

export type MessagingGroupMember = {
  EncryptedKey: string;
  GroupMemberKeyName: string;
  GroupMemberPublicKeyBase58Check: string;
};

@Injectable({
  providedIn: 'root',
})
export class IdentityService {
  // All outbound request promises we still need to resolve
  private outboundRequests: { [key: string]: any } = {};

  // Opener can be null, parent is never null
  private currentWindow = opener || parent;

  // Embed component checks for browser support
  browserSupported = true;

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService,
    private cookieService: CookieService,
    private signingService: SigningService,
    private accountService: AccountService,
    private backendApi: BackendAPIService
  ) {
    window.addEventListener('message', (event) => this.handleMessage(event));
  }

  // Outgoing Messages

  initialize(): Observable<any> {
    return this.send('initialize', {});
  }

  /**
   * @param status whether or not the user confirmed access to storage.
   */
  storageGranted(status: boolean): void {
    this.cast('storageGranted', {
      status,
    });
  }

  login(payload: {
    users: { [key: string]: PublicUserInfo };
    publicKeyAdded?: string;
    signedUp?: boolean;
    signedTransactionHex?: string;
    jumioSuccess?: boolean;
    phoneNumberSuccess?: boolean;
  }): void {
    this.accountService.populateCookies();

    if (this.globalVars.callback) {
      // If callback is passed, we redirect to it with payload as URL parameters.
      let httpParams = new HttpParams();
      for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
          httpParams = httpParams.append(key, (payload as any)[key].toString());
        }
      }
      window.location.href =
        this.globalVars.callback + `?${httpParams.toString()}`;
    } else {
      this.cast('login', payload);
    }
  }

  derive(payload: DerivePayload): void {
    this.backendApi.GetAppState().subscribe((res) => {
      const blockHeight = res.BlockHeight;
      this.accountService
        .getDerivedPrivateUser(
          this.backendApi,
          payload.publicKey,
          blockHeight,
          payload.transactionSpendingLimit,
          payload.derivedPublicKey,
          payload.expirationDays
        )
        .then((derivedPrivateUserInfo) => {
          if (this.globalVars.callback) {
            // If callback is passed, we redirect to it with payload as URL parameters.
            const httpParams = this.parseTypeToHttpParams(
              derivedPrivateUserInfo
            );
            window.location.href =
              this.globalVars.callback + `?${httpParams.toString()}`;
          } else {
            this.cast('derive', derivedPrivateUserInfo);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    });
  }

  messagingGroup(payload: MessagingGroupPayload): void {
    this.accountService.populateCookies();
    if (this.globalVars.callback) {
      // If callback is passed, we redirect to it with payload as URL parameters.
      const httpParams = this.parseTypeToHttpParams(payload);
      window.location.href =
        this.globalVars.callback + `?${httpParams.toString()}`;
    } else {
      this.cast('messagingGroup', payload);
    }
  }

  parseTypeToHttpParams(payload: any): HttpParams {
    let httpParams = new HttpParams();
    for (const key in payload) {
      if (payload.hasOwnProperty(key)) {
        const paramVal = (payload as any)[key];
        if (paramVal !== null && paramVal !== undefined) {
          httpParams = httpParams.append(key, paramVal.toString());
        }
      }
    }
    return httpParams;
  }

  // Incoming Messages

  private handleBurn(data: any): void {
    if (!this.approve(data, AccessLevel.Full)) {
      return;
    }

    const {
      id,
      payload: { encryptedSeedHex, unsignedHashes },
    } = data;
    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
    const signedHashes = this.signingService.signHashes(
      seedHex,
      unsignedHashes
    );

    this.respond(id, {
      signedHashes,
    });
  }

  private handleSignETH(data: any): void {
    if (!this.approve(data, AccessLevel.Full)) {
      return;
    }

    const {
      id,
      payload: { encryptedSeedHex, unsignedHashes },
    } = data;
    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
    const signatures = this.signingService.signHashesETH(
      seedHex,
      unsignedHashes
    );

    this.respond(id, {
      signatures,
    });
  }

  private handleSign(data: any): void {
    const {
      id,
      payload: { encryptedSeedHex, transactionHex },
    } = data;

    // This will tell us whether we need full signing access or just ApproveLarge
    // level of access.
    const requiredAccessLevel = this.getRequiredAccessLevel(transactionHex);

    // In the case that approve() fails, it responds with a message indicating
    // that approvalRequired = true, which the caller can then uses to trigger
    // the /approve UI.
    if (!this.approve(data, requiredAccessLevel)) {
      return;
    }

    // If we get to this point, no approval UI was required. This typically
    // happens if the caller has full signing access or signing access for
    // non-spending txns such as like, post, update profile, etc. In the
    // latter case we need a subsequent check to ensure that the txn is not
    // sending money to any public keys other than the sender himself.
    if (!this.approveSpending(data)) {
      return;
    }

    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
    try {
      const isDerived =
        this.accountService.isDerivedKeyAccountFromEncryptedSeedHex(
          encryptedSeedHex
        );

      const signedTransactionHex = this.signingService.signTransaction(
        seedHex,
        transactionHex,
        isDerived
      );

      this.respond(id, {
        signedTransactionHex,
      });
    } catch (e: any) {
      console.error(e);
      if (e.message === ERROR_USER_AND_COOKIE_NOT_FOUND) {
        this.respond(id, {
          error: e.message,
          requestDerivedCookieWithEncryptedSeed: true,
        });
      } else {
        this.respond(id, { error: e.message }); // unhandled error, no suggestion on fix
      }
    }
  }
  // Encrypt with shared secret
  private handleEncrypt(data: any): void {
    if (!this.approve(data, AccessLevel.ApproveAll)) {
      return;
    }

    const {
      id,
      payload: {
        encryptedSeedHex,
        senderGroupKeyName,
        recipientPublicKey,
        message,
      },
    } = data;
    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );

    // In the DeSo V3 Messages, users can register messaging keys on the blockchain. When invoking this function, one
    // can ask this function to encrypt a message from sender's derived messaging key. For example if we want to use
    // the "default-key" or any other deterministically derived messaging key, we can call this function with the field
    // senderGroupKeyName parameter.

    try {
      const encryptedMessage = this.accountService.encryptMessage(
        seedHex,
        senderGroupKeyName,
        recipientPublicKey,
        message
      );

      this.respond(id, { ...encryptedMessage });
    } catch (e: any) {
      console.error(e);
      if (
        e.message ===
        ERROR_NO_MESSAGING_KEY_RANDOMNESS_FOUND ||
        e.message ===
        ERROR_GETTING_MESSAGING_KEY_FOR_SEED_AFTER_COOKIE_FOUND
      ) {
        this.respond(id, {
          error: e.message,
          requestMessagingRandomnessCookieWithPublicKey: true,
          encryptedMessage: '', // We include an empty encryptedMessage for backward compatibility.
        });
      } else if (
        e.message ===
        ERROR_USER_NOT_FOUND
      ) {
        this.respond(id, {
          error: e.message,
          requestDerivedCookieWithEncryptedSeed: true,
          encryptedMessage: '',
        });
      } else {
        this.respond(id, { error: e.message, encryptedMessage: '', }); // unhandled error, no suggestion on fix
      }
    }
  }

  private handleDecrypt(data: any): void {
    if (!this.approve(data, AccessLevel.ApproveAll)) {
      return;
    }

    const encryptedSeedHex = data.payload.encryptedSeedHex;
    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
    const id = data.id;

    if (data.payload.encryptedHexes) {
      // Legacy public key decryption
      const encryptedHexes = data.payload.encryptedHexes;
      try {
        const decryptedHexes = this.accountService.decryptMessagesLegacy(
          seedHex,
          encryptedHexes
        );
        this.respond(id, {
          decryptedHexes,
        });
      } catch (e: any) {
        console.error(e);
        // We include an empty decryptedHexes response to be backward compatible
        this.respond(id, { error: e.message, decryptedHexes: {} }); // no suggestion just throw
      }
    } else {
      // First, we make sure we have the necessary information to decrypt.
      try {
        const isDerived = this.accountService.isDerivedKeyAccountFromEncryptedSeedHex(encryptedSeedHex);
        if (isDerived) {
          // We need messaging randomness
          const messagingRandomness = this.accountService.getMessagingRandomnessForSeedHex(seedHex);
          if (!messagingRandomness) {
            this.respond(id, {
              error: ERROR_NO_MESSAGING_KEY_RANDOMNESS_FOUND,
              requestMessagingRandomnessCookieWithPublicKey: true,
              decryptedHexes: {}, // Include empty decrypted hexes for backward compatibility
            });
            return;
          }
        }
      } catch (e: any) {
        console.error(e);
        if (
          e.message ===
          ERROR_NO_MESSAGING_KEY_RANDOMNESS_FOUND ||
          e.message === ERROR_NO_ENCRYPTED_MESSAGING_RANDOMNESS_COOKIE
        ) {
          this.respond(id, {
            error: e.message,
            requestMessagingRandomnessCookieWithPublicKey: true,
            decryptedHexes: {}, // Include empty decrypted hexes for backward compatibility
          });
        } else if (
          e.message === ERROR_USER_NOT_FOUND ||
          e.message === ERROR_USER_AND_COOKIE_NOT_FOUND
        ) {
          this.respond(id, {
            error: e.message,
            requestDerivedCookieWithEncryptedSeed: true,
            decryptedHexes: {}, // Include empty decrypted hexes for backward compatibility
          });
        } else {
          this.respond(id, { error: e.message }); // no suggestion just throw
        }
        return;
      }
      // Messages can be V1, V2, or V3. The message entries will indicate version.
      const encryptedMessages = data.payload.encryptedMessages;
      this.accountService
        .decryptMessages(
          seedHex,
          encryptedMessages,
          data.payload.messagingGroups || []
        )
        .then(
          (res) => this.respond(id, { decryptedHexes: res }),
          (err) => {
            console.error(err);
            this.respond(id, { decryptedHexes: {}, error: err });
          },
        );
    }
  }

  private handleJwt(data: any): void {
    if (!this.approve(data, AccessLevel.ApproveAll)) {
      return;
    }

    const {
      id,
      payload: { encryptedSeedHex },
    } = data;
    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
    try {
      const isDerived =
        this.accountService.isDerivedKeyAccountFromEncryptedSeedHex(
          encryptedSeedHex
        );
      const jwt = this.signingService.signJWT(seedHex, isDerived);

      this.respond(id, {
        jwt,
      });
    } catch (e: any) {
      console.error(e);
      if (e.message === ERROR_USER_AND_COOKIE_NOT_FOUND) {
        this.respond(id, {
          error: e.message,
          requestDerivedCookieWithEncryptedSeed: true,
        });
      } else {
        this.respond(id, { error: e.message }); // no suggestion just throw
      }
    }
  }

  private async handleInfo(event: MessageEvent): Promise<void> {
    // check storage access API
    let hasStorageAccess = true;
    if (this.cryptoService.mustUseStorageAccess()) {
      hasStorageAccess = await document?.hasStorageAccess();
    }

    // check for localStorage access
    let hasLocalStorageAccess;
    try {
      hasLocalStorageAccess = !!localStorage;
    } catch (e) {
      hasLocalStorageAccess = false;
    }

    // check for cookie access
    this.cookieService.put('deso-test-access', 'true');
    const hasCookieAccess = !!this.cookieService.get('deso-test-access');

    // store if browser is supported or not
    this.browserSupported = hasCookieAccess || hasLocalStorageAccess;

    this.respond(event.data.id, {
      hasCookieAccess,
      hasStorageAccess,
      hasLocalStorageAccess,
      browserSupported: this.browserSupported,
    });
  }

  // Access levels

  private getRequiredAccessLevel(transactionHex: string): AccessLevel {
    const txBytes = new Buffer(transactionHex, 'hex');
    const transaction = Transaction.fromBytes(txBytes)[0] as Transaction;

    switch (transaction.metadata?.constructor) {
      case TransactionMetadataBasicTransfer:
      case TransactionMetadataBitcoinExchange:
      case TransactionMetadataUpdateBitcoinUSDExchangeRate:
      case TransactionMetadataCreatorCoin:
      case TransactionMetadataCreatorCoinTransfer:
      case TransactionMetadataSwapIdentity:
      case TransactionMetadataUpdateGlobalParams:
      case TransactionMetadataUpdateProfile:
      case TransactionMetadataCreateNFT:
      case TransactionMetadataUpdateNFT:
      case TransactionMetadataAcceptNFTBid:
      case TransactionMetadataNFTBid:
      case TransactionMetadataNFTTransfer:
      case TransactionMetadataAcceptNFTTransfer:
      case TransactionMetadataBurnNFT:
      case TransactionMetadataAuthorizeDerivedKey:
      case TransactionMetadataDAOCoin:
      case TransactionMetadataTransferDAOCoin:
      case TransactionMetadataDAOCoinLimitOrder:
        return AccessLevel.Full;

      case TransactionMetadataFollow:
      case TransactionMetadataPrivateMessage:
      case TransactionMetadataSubmitPost:
      case TransactionMetadataLike:
        return AccessLevel.ApproveLarge;
    }

    return AccessLevel.Full;
  }

  private hasAccessLevel(data: any, requiredAccessLevel: AccessLevel): boolean {
    const {
      payload: { encryptedSeedHex, accessLevel, accessLevelHmac },
    } = data;
    if (accessLevel < requiredAccessLevel) {
      return false;
    }

    const seedHex = this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
    return this.cryptoService.validAccessLevelHmac(
      accessLevel,
      seedHex,
      accessLevelHmac
    );
  }

  // This method checks if transaction in the payload has correct outputs for requested AccessLevel.
  private approveSpending(data: any): boolean {
    const {
      payload: { accessLevel, transactionHex },
    } = data;

    // If the requested access level is ApproveLarge, we want to confirm that transaction doesn't
    // attempt sending $DESO to a non-owner public key. If it does, we respond with approvalRequired.
    if (accessLevel === AccessLevel.ApproveLarge) {
      const txBytes = new Buffer(transactionHex, 'hex');
      const transaction = Transaction.fromBytes(txBytes)[0] as Transaction;
      for (const output of transaction.outputs) {
        if (
          output.publicKey.toString('hex') !==
          transaction.publicKey.toString('hex')
        ) {
          this.respond(data.id, { approvalRequired: true });
          return false;
        }
      }
    }
    return true;
  }

  private approve(data: any, accessLevel: AccessLevel): boolean {
    const hasAccess = this.hasAccessLevel(data, accessLevel);
    const hasEncryptionKey = this.cryptoService.hasSeedHexEncryptionKey(
      this.globalVars.hostname
    );

    if (!hasAccess || !hasEncryptionKey) {
      this.respond(data.id, { approvalRequired: true });
      return false;
    }

    return true;
  }

  // Message handling

  private handleMessage(event: MessageEvent): void {
    const { data } = event;
    const { service, method } = data;

    if (service !== 'identity') {
      return;
    }

    // Methods are present on incoming requests but not responses
    if (method) {
      this.handleRequest(event);
    } else {
      this.handleResponse(event);
    }
  }

  private handleRequest(event: MessageEvent): void {
    const data = event.data;
    const method = data.method;

    if (method === 'burn') {
      this.handleBurn(data);
    } else if (method === 'encrypt') {
      this.handleEncrypt(data);
    } else if (method === 'decrypt') {
      this.handleDecrypt(data);
    } else if (method === 'sign') {
      this.handleSign(data);
    } else if (method === 'signETH') {
      this.handleSignETH(data);
    } else if (method === 'jwt') {
      this.handleJwt(data);
    } else if (method === 'info') {
      this.handleInfo(event);
    } else {
      console.error('Unhandled identity request');
      console.error(event);
    }
  }

  private handleResponse(event: MessageEvent): void {
    const {
      data: { id, payload },
      origin,
    } = event;
    const hostname = new URL(origin).hostname;
    const result = {
      id,
      payload,
      hostname,
    };

    const req = this.outboundRequests[id];
    if (!req) {
      console.error('No matching outbound request');
      return;
    }
    req.next(result);
    req.complete();
    delete this.outboundRequests[id];
  }

  // Send a new message and expect a response
  private send(method: string, payload: any): Subject<any> {
    const id = uuid();
    const subject = new Subject();
    this.outboundRequests[id] = subject;

    this.postMessage({
      id,
      service: 'identity',
      method,
      payload,
    });

    return subject;
  }

  // Respond to a received message
  private respond(id: string, payload: any): void {
    this.postMessage({
      id,
      service: 'identity',
      payload,
    });
  }

  // Transmit a message without expecting a response
  private cast(method: string, payload?: any): void {
    this.postMessage({
      id: null,
      service: 'identity',
      method,
      payload,
    });
  }

  // Post message to correct client
  private postMessage(message: any): void {
    if (this.globalVars.webview) {
      if (
        this.currentWindow.webkit?.messageHandlers?.desoIdentityAppInterface !==
        undefined
      ) {
        // iOS Webview with registered "desoIdentityAppInterface" handler
        this.currentWindow.webkit.messageHandlers.desoIdentityAppInterface.postMessage(
          message,
          '*'
        );
      } else if (this.currentWindow.desoIdentityAppInterface !== undefined) {
        // Android Webview with registered "desoIdentityAppInterface" handler
        this.currentWindow.desoIdentityAppInterface.postMessage(
          JSON.stringify(message),
          '*'
        );
      } else if (this.currentWindow.ReactNativeWebView !== undefined) {
        // React Native Webview with registered "ReactNativeWebView" handler
        this.currentWindow.ReactNativeWebView.postMessage(
          JSON.stringify(message)
        );
      } else if (
        this.currentWindow.webkit?.messageHandlers
          ?.bitcloutIdentityAppInterface !== undefined
      ) {
        // DEPRECATED: iOS Webview with registered "bitcloutIdentityAppInterface" handler
        this.currentWindow.webkit.messageHandlers.bitcloutIdentityAppInterface.postMessage(
          message,
          '*'
        );
      } else if (
        this.currentWindow.bitcloutIdentityAppInterface !== undefined
      ) {
        // DEPRECATED: Android Webview with registered "bitcloutIdentityAppInterface" handler
        this.currentWindow.bitcloutIdentityAppInterface.postMessage(
          JSON.stringify(message),
          '*'
        );
      }
    } else {
      this.currentWindow.postMessage(message, '*');
    }
  }
}

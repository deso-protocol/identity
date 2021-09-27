import {Injectable} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {v4 as uuid} from 'uuid';
import {AccessLevel, PublicUserInfo} from '../types/identity';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';
import {CookieService} from 'ngx-cookie';
import {SigningService} from './signing.service';
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
  TransactionMetadataBurnNFT
} from '../lib/deso/transaction';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {
  // All outbound request promises we still need to resolve
  private outboundRequests: {[key: string]: any} = {};

  // Opener can be null, parent is never null
  private currentWindow = opener || parent;

  // Embed component checks for browser support
  browserSupported = true;

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService,
    private cookieService: CookieService,
    private signingService: SigningService,
  ) {
    window.addEventListener('message', (event) => this.handleMessage(event));
  }

  // Outgoing Messages

  initialize(): Observable<any> {
    return this.send('initialize', {});
  }

  storageGranted(): void {
    this.cast('storageGranted');
  }

  login(payload: {
    users: {[key: string]: PublicUserInfo},
    publicKeyAdded?: string,
    signedUp?: boolean
    signedTransactionHex?: string,
    jumioSuccess?: boolean,
  }): void {
    this.cast('login', payload);
  }

  import(): Observable<any> {
    return this.send('import', {});
  }

  // Incoming Messages

  private handleBurn(data: any): void {
    if (!this.approve(data, AccessLevel.Full)) {
      return;
    }

    const { id, payload: { encryptedSeedHex, unsignedHashes } } = data;
    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
    const signedHashes = this.signingService.signBurn(seedHex, unsignedHashes);

    this.respond(id, {
      signedHashes,
    });
  }

  private handleSign(data: any): void {
    const { id, payload: { encryptedSeedHex, transactionHex } } = data;
    const requiredAccessLevel = this.getRequiredAccessLevel(transactionHex);
    if (!this.approve(data, requiredAccessLevel)) {
      return;
    }

    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
    const signedTransactionHex = this.signingService.signTransaction(seedHex, transactionHex);

    this.respond(id, {
      signedTransactionHex,
    });
  }

  // Encrypt with shared secret
  private handleEncrypt(data: any): void{
    if (!this.approve(data, AccessLevel.ApproveAll)){
      return;
    }

    const { id, payload: { encryptedSeedHex, recipientPublicKey, message} } = data;
    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
    const encryptedMessage = this.signingService.encryptMessage(seedHex, recipientPublicKey, message);
    this.respond(id, {
      encryptedMessage
    });
  }

  private handleDecrypt(data: any): void {
    if (!this.approve(data, AccessLevel.ApproveAll)) {
      return;
    }

    const seedHex = this.cryptoService.decryptSeedHex(data.payload.encryptedSeedHex, this.globalVars.hostname);
    const id = data.id;

    let decryptedHexes;
    if (data.payload.encryptedHexes){
      // Legacy public key decryption
      const encryptedHexes = data.payload.encryptedHexes;
      decryptedHexes = this.signingService.decryptMessagesLegacy(seedHex, encryptedHexes);
    } else {
      // Shared secret decryption
      const encryptedMessages = data.payload.encryptedMessages;
      decryptedHexes = this.signingService.decryptMessages(seedHex, encryptedMessages);
    }

    this.respond(id, {
      decryptedHexes
    });
  }

  private handleJwt(data: any): void {
    if (!this.approve(data, AccessLevel.ApproveAll)) {
      return;
    }

    const { id, payload: { encryptedSeedHex } } = data;
    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
    const jwt = this.signingService.signJWT(seedHex);

    this.respond(id, {
      jwt
    });
  }

  private async handleInfo(event: MessageEvent): Promise<void> {
    // check storage access API
    let hasStorageAccess = true;
    if (this.cryptoService.mustUseStorageAccess()) {
      hasStorageAccess = await document.hasStorageAccess();
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
    const transaction = Transaction.fromBytes(txBytes)[0] as Transaction<any>;

    switch (transaction.metadata.constructor) {
      case TransactionMetadataBasicTransfer:
      case TransactionMetadataBitcoinExchange:
      case TransactionMetadataUpdateBitcoinUSDExchangeRate:
      case TransactionMetadataCreatorCoin:
      case TransactionMetadataCreatorCoinTransfer:
      case TransactionMetadataSwapIdentity:
      case TransactionMetadataUpdateGlobalParams:
      case TransactionMetadataUpdateProfile:
      case TransactionMetadataNFTTransfer:
      case TransactionMetadataAcceptNFTTransfer:
      case TransactionMetadataBurnNFT:
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
    const { payload: { encryptedSeedHex, accessLevel, accessLevelHmac }} = data;
    if (accessLevel < requiredAccessLevel) {
      return false;
    }

    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
    return this.cryptoService.validAccessLevelHmac(accessLevel, seedHex, accessLevelHmac);
  }

  private approve(data: any, accessLevel: AccessLevel): boolean {
    const hasAccess = this.hasAccessLevel(data, accessLevel);
    const hasEncryptionKey = this.cryptoService.hasSeedHexEncryptionKey(this.globalVars.hostname);

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

    if (service !== 'identity') { return; }

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
    } else if (method === 'encrypt'){
      this.handleEncrypt(data);
    } else if (method === 'decrypt') {
      this.handleDecrypt(data);
    } else if (method === 'sign') {
      this.handleSign(data);
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
    const { data: { id, payload }, origin } = event;
    const hostname = new URL(origin).hostname;
    const result = {
      id,
      payload,
      hostname,
    };

    const req = this.outboundRequests[id];
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
      payload
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
      if (this.currentWindow.webkit?.messageHandlers?.desoIdentityAppInterface !== undefined) {
        // iOS Webview with registered "desoIdentityAppInterface" handler
        this.currentWindow.webkit.messageHandlers.desoIdentityAppInterface.postMessage(message, '*');
      } else if (this.currentWindow.desoIdentityAppInterface !== undefined) {
        // Android Webview with registered "desoIdentityAppInterface" handler
        this.currentWindow.desoIdentityAppInterface.postMessage(JSON.stringify(message), '*');
      } else if (this.currentWindow.ReactNativeWebView !== undefined) {
        // React Native Webview with registered "ReactNativeWebView" handler
        this.currentWindow.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    } else {
      this.currentWindow.postMessage(message, '*');
    }
  }
}

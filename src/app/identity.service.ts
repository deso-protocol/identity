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
  TransactionMetadataFollow,
  TransactionMetadataLike,
  TransactionMetadataPrivateMessage,
  TransactionMetadataSubmitPost,
  TransactionMetadataSwapIdentity,
  TransactionMetadataUpdateBitcoinUSDExchangeRate,
  TransactionMetadataUpdateGlobalParams,
  TransactionMetadataUpdateProfile
} from '../lib/bitclout/transaction';

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

  private handleDecrypt(data: any): void {
    if (!this.approve(data, AccessLevel.ApproveAll)) {
      return;
    }

    const { id, payload: { encryptedSeedHex, encryptedHexes } } = data;
    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);
    const decryptedHexes = this.signingService.decryptMessages(seedHex, encryptedHexes);

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
    this.cookieService.put('bitclout-test-access', 'true');
    const hasCookieAccess = !!this.cookieService.get('bitclout-test-access');

    // store if browser is supported or not
    this.browserSupported = hasCookieAccess || hasLocalStorageAccess;

    this.respond(event.data.id, {
      hasStorageAccess,
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
      case TransactionMetadataSwapIdentity:
      case TransactionMetadataUpdateGlobalParams:
        return AccessLevel.Full;

      case TransactionMetadataFollow:
      case TransactionMetadataPrivateMessage:
      case TransactionMetadataSubmitPost:
      case TransactionMetadataUpdateProfile:
      case TransactionMetadataLike:
        return AccessLevel.ApproveLarge;
    }

    return AccessLevel.Full;
  }

  private hasAccessLevel(data: any, requiredAccessLevel: AccessLevel): boolean {
    const { payload: { encryptedSeedHex, accessLevel, accessLevelHmac }} = data;
    if (accessLevel < requiredAccessLevel) {
      console.log('less');
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

    this.currentWindow.postMessage({
      id,
      service: 'identity',
      method,
      payload,
    }, '*');

    return subject;
  }

  // Respond to a received message
  private respond(id: string, payload: any): void {
    this.currentWindow.postMessage({
      id,
      service: 'identity',
      payload
    }, '*');
  }

  // Transmit a message without expecting a response
  private cast(method: string, payload?: any): void {
    this.currentWindow.postMessage({
      id: null,
      service: 'identity',
      method,
      payload,
    }, '*');
  }
}

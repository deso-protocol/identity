import { Injectable } from '@angular/core';
import {Observable, Subject} from 'rxjs';
import { v4 as uuid } from 'uuid';
import {PublicUserInfo} from '../types/identity';
import * as sha256 from 'sha256';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';
import * as ecies from '../lib/ecies';
import {CookieService} from 'ngx-cookie';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {
  // All outbound request promises we still need to resolve
  private outboundRequests: {[key: string]: any} = {};

  // Embed component checks for browser support
  browserSupported = true;

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService,
    private cookieService: CookieService,
  ) {
    this.globalVars.getWindow().addEventListener('message', (event) => this.handleMessage(event));
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
  }): void {
    this.cast('login', payload);
  }

  import(): Observable<any> {
    return this.send('import', {});
  }

  // Incoming Messages

  private handleBurn(data: any): void {
    const { id, payload: { encryptedSeedHex, unsignedHashes } } = data;
    const privateKey = this.cryptoService.encryptedSeedHexToPrivateKey(encryptedSeedHex, this.globalVars.hostname);
    const signedHashes = [];

    for (const unsignedHash of unsignedHashes) {
      const signature = privateKey.sign(unsignedHash);
      const signatureBytes = new Buffer(signature.toDER());
      signedHashes.push(signatureBytes.toString('hex'));
    }

    this.respond(id, {
      signedHashes,
    });
  }

  private handleSign(data: any): void {
    const { id, payload: { encryptedSeedHex, transactionHex } } = data;
    const privateKey = this.cryptoService.encryptedSeedHexToPrivateKey(encryptedSeedHex, this.globalVars.hostname);

    const transactionBytes = new Buffer(transactionHex, 'hex');
    const transactionHash = new Buffer(sha256.x2(transactionBytes), 'hex');
    const signature = privateKey.sign(transactionHash);
    const signatureBytes = new Buffer(signature.toDER());
    const signatureLength = this.cryptoService.uintToBuf(signatureBytes.length);

    const signedTransactionBytes = Buffer.concat([
      // This slice is bad. We need to remove the existing signature length field prior to appending the new one.
      // Once we have frontend transaction construction we won't need to do this.
      transactionBytes.slice(0, -1),
      signatureLength,
      signatureBytes,
    ]);

    this.respond(id, {
      signature,
      signedTransactionHex: signedTransactionBytes.toString('hex'),
    });
  }

  // Decrypt is async so we can use await.
  // Do we wanna define all handleAction functions as async?
  private handleDecrypt(data: any): void {
    const { id, payload: { encryptedSeedHex, encryptedHexes } } = data;
    const privateKey = this.cryptoService.encryptedSeedHexToPrivateKey(encryptedSeedHex, this.globalVars.hostname);
    const privateKeyBuffer = privateKey.getPrivate().toBuffer();

    const decryptedHexes: { [key: string]: any } = {};
    for (const encryptedHex of encryptedHexes) {
      const encryptedBytes = new Buffer(encryptedHex, 'hex');
      try {
        decryptedHexes[encryptedHex] = ecies.decrypt(privateKeyBuffer, encryptedBytes);
      } catch (e) {
        console.error(e);
      }
    }

    this.respond(id, {
      decryptedHexes
    });
  }

  private handleJwt(data: any): void {
    const { id, payload: { encryptedSeedHex } } = data;
    const seedHex = this.cryptoService.decryptSeedHex(encryptedSeedHex, this.globalVars.hostname);

    const keyEncoder = new KeyEncoder('secp256k1');
    const encodedPrivateKey = keyEncoder.encodePrivate(seedHex, 'raw', 'pem');
    const jwt = jsonwebtoken.sign({ }, encodedPrivateKey, { algorithm: 'ES256', expiresIn: 60 });

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
      browserSupported: this.browserSupported
    });
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

    this.globalVars.getCurrentWindow().postMessage({
      id,
      service: 'identity',
      method,
      payload,
    }, '*');

    return subject;
  }

  // Respond to a received message
  private respond(id: string, payload: any): void {
    this.globalVars.getCurrentWindow().postMessage({
      id,
      service: 'identity',
      payload
    }, '*');
  }

  // Transmit a message without expecting a response
  private cast(method: string, payload?: any): void {
    this.globalVars.getCurrentWindow().postMessage({
      id: null,
      service: 'identity',
      method,
      payload,
    }, '*');
  }
}

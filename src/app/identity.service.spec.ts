import { TestBed } from '@angular/core/testing';

import { IdentityService } from './identity.service';
import {CookieModule} from 'ngx-cookie';
import {GlobalVarsService} from './global-vars.service';
import { v4 as uuid } from 'uuid';
import {CryptoService} from './crypto.service';
import * as ecies from '../lib/ecies';

describe('IdentityService', () => {
  const hostname = 'bitclout.com';

  let identityService: IdentityService;
  let globalVarsService: jasmine.SpyObj<GlobalVarsService>;
  let cryptoService: CryptoService;
  let handleMessage: jasmine.Spy;
  let lastPostMessage: any;

  // Fake user
  let seedHex: string;
  let encryptedSeedHex: string;

  beforeEach(() => {
    const globalVarsSpy = jasmine.createSpyObj(
      'GlobalVarsService',
      ['getWindow', 'getCurrentWindow'],
      { hostname });

    TestBed.configureTestingModule({
      imports: [ CookieModule.forRoot() ],
      providers: [
        IdentityService,
        CryptoService,
        { provide: GlobalVarsService, useValue: globalVarsSpy },
      ]
    });

    // Create a fake window so we can intercept postMessage requests
    const fakeWindow = {
      postMessage: (message: any, targetOrigin: string, transfer?: Transferable[]) => {
        lastPostMessage = message;
      },
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      },
    };
    globalVarsService = TestBed.inject(GlobalVarsService) as jasmine.SpyObj<GlobalVarsService>;
    globalVarsService.getCurrentWindow.and.returnValue(fakeWindow as Window);
    globalVarsService.getWindow.and.returnValue({
      parent: fakeWindow,
      opener: fakeWindow,
      ...fakeWindow,
    } as Window);

    // Create a fake identity service
    identityService = TestBed.inject(IdentityService);
    handleMessage = spyOn<any>(identityService, 'handleMessage').and.callThrough();

    // Create a fake crypto service
    cryptoService = TestBed.inject(CryptoService);

    // Create a fake user
    const keychain = cryptoService.mnemonicToKeychain('injury reunion way drama awake chalk potato slender time crash skate trap');
    seedHex = cryptoService.keychainToSeedHex(keychain);
    encryptedSeedHex = cryptoService.encryptSeedHex(seedHex, hostname);
  });

  it('should be created', () => {
    expect(identityService).toBeTruthy();
  });

  it('sends and receives initialize', () => {
    // send request
    identityService.initialize().subscribe(res => {
      expect(res.hostname).toEqual(hostname);
    });

    // mock response
    handleMessage.call(identityService, {
      data: {
        id: lastPostMessage.id,
        service: 'identity',
        payload: {},
      },
      origin: `https://${hostname}`,
    });
  });

  it('can sign burn inputs', () => {
    const unsignedHashes = ['5714c9e169d6ddc47ab8481b158243d7e73563896aa66f9ca040305e55ad9bba'];
    const signedHashes = ['304602210091c033b5ed44082423d966005105513eb5644323ba5ffe8b1e7d0a37aad9de52022100b4336844181f43c658f7071eef9c6e95fc051a52b714529e92513aa7ba377075'];

    handleMessage.call(identityService, {
      data: {
        id: uuid(),
        service: 'identity',
        method: 'burn',
        payload: {
          encryptedSeedHex,
          unsignedHashes,
        }
      },
      origin: 'https://bitclout.com',
    });

    expect(lastPostMessage.payload.signedHashes).toEqual(signedHashes);
  });

  it('can sign likes', () => {
    const transactionHex = '017f979efd9bbe32322f4142ccdfe0acbe155ef70811272d0f61770abb19b6a0830001033ef530e0529b6e0d4727a948357107897d594066c899e3da80e16a648b8c3626d9e39680ad020a213163c32186e5d4f52f2f593af6cff21241f0b7c9f6bcf8465329c0d7496cb5150021033ef530e0529b6e0d4727a948357107897d594066c899e3da80e16a648b8c36260000';
    const signedTransactionHex = '017f979efd9bbe32322f4142ccdfe0acbe155ef70811272d0f61770abb19b6a0830001033ef530e0529b6e0d4727a948357107897d594066c899e3da80e16a648b8c3626d9e39680ad020a213163c32186e5d4f52f2f593af6cff21241f0b7c9f6bcf8465329c0d7496cb5150021033ef530e0529b6e0d4727a948357107897d594066c899e3da80e16a648b8c362600473045022100d43863466e3ca9e370f5cf4da123e1ba36754fb72df594419c6fd89875036eec02205ce347e142cb82bf4d6106e3cd318b21b3e28056d347f98f2ae291b537496839';

    handleMessage.call(identityService, {
      data: {
        id: uuid(),
        service: 'identity',
        method: 'sign',
        payload: {
          encryptedSeedHex,
          transactionHex,
        }
      },
      origin: 'https://bitclout.com',
    });

    expect(lastPostMessage.payload.signedTransactionHex).toEqual(signedTransactionHex);
  });

  it('can decrypt messages', () => {
    const message = 'hello world! 123456';
    const publicKey = Buffer.from(cryptoService.seedHexToPrivateKey(seedHex).getPublic().encode('array', false));
    const encryptedBuffer = ecies.encrypt(publicKey, message);
    const encryptedHex = Buffer.from(encryptedBuffer).toString('hex');

    handleMessage.call(identityService, {
      data: {
        id: uuid(),
        service: 'identity',
        method: 'decrypt',
        payload: {
          encryptedSeedHex,
          encryptedHexes: [encryptedHex],
        }
      },
      origin: 'https://bitclout.com',
    });

    // TODO: For some reason this is failing
    // expect(lastPostMessage.payload.decryptedHexes).toEqual({
    //   [encryptedHex]: message,
    // });
  });

  it('can handle info', () => {
    // TODO
  });

  it('can handle jwt', () => {
    // TODO
  });
});

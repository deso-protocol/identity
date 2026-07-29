import { TestBed } from '@angular/core/testing';
import { ec } from 'elliptic';
import KeyEncoder from 'key-encoder';

import { verifyJwtES256 } from '../lib/jwt';
import { CryptoService } from './crypto.service';
import { GlobalVarsService } from './global-vars.service';
import { SigningService } from './signing.service';

describe('SigningService', () => {
  let service: SigningService;
  let cryptoService: jasmine.SpyObj<CryptoService>;
  let keyPair: ec.KeyPair;

  beforeEach(() => {
    keyPair = new ec('secp256k1').keyFromPrivate('01'.padStart(64, '0'));
    cryptoService = jasmine.createSpyObj<CryptoService>('CryptoService', [
      'seedHexToKeyPair',
    ]);
    cryptoService.seedHexToKeyPair.and.returnValue(keyPair);

    TestBed.configureTestingModule({
      providers: [
        SigningService,
        { provide: CryptoService, useValue: cryptoService },
        { provide: GlobalVarsService, useValue: {} },
      ],
    });
    service = TestBed.inject(SigningService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('produces verifiable ES256 JWTs after dependency remediation', () => {
    const token = service.signJWT('test-only-seed', false, { expiration: 60 });
    const keyEncoder = new KeyEncoder('secp256k1');
    const encodedPublicKey = keyEncoder.encodePublic(
      keyPair.getPublic('hex'),
      'raw',
      'pem'
    );
    const payload = verifyJwtES256(token, encodedPublicKey);

    expect(token.split('.').length).toBe(3);
    expect(payload.exp - payload.iat).toBe(60);
    expect(() =>
      verifyJwtES256(token, encodedPublicKey, payload.exp)
    ).toThrowError('JWT claims are invalid or expired');
  });

  it('signs a valid 32-byte hash after converting it to a Buffer', () => {
    const hashHex = 'ab'.repeat(32);
    const signSpy = spyOn(keyPair, 'sign').and.callThrough();

    const [signatureHex] = service.signHashes('test-only-seed', [hashHex]);

    const signedValue = signSpy.calls.mostRecent().args[0];
    expect(Buffer.isBuffer(signedValue)).toBeTrue();
    expect((signedValue as Buffer).length).toBe(32);
    expect(
      keyPair.verify(Buffer.from(hashHex, 'hex'), signatureHex)
    ).toBeTrue();
  });

  it('accepts uppercase hexadecimal hashes', () => {
    const hashHex = 'AB'.repeat(32);

    const [signatureHex] = service.signHashes('test-only-seed', [hashHex]);

    expect(
      keyPair.verify(Buffer.from(hashHex, 'hex'), signatureHex)
    ).toBeTrue();
  });

  it('validates Ethereum hashes and signs the decoded Buffer', () => {
    const hashHex = 'cd'.repeat(32);
    const signSpy = spyOn(keyPair, 'sign').and.callThrough();

    const [signature] = service.signHashesETH('test-only-seed', [hashHex]);

    const signedValue = signSpy.calls.mostRecent().args[0];
    expect(Buffer.isBuffer(signedValue)).toBeTrue();
    expect((signedValue as Buffer).length).toBe(32);
    expect(signature.r).toMatch(/^0x[0-9a-f]+$/);
    expect(signature.s).toMatch(/^0x[0-9a-f]+$/);
    expect(signature.v === 0 || signature.v === 1).toBeTrue();
  });

  it('rejects non-array requests before accessing the private key', () => {
    const invalidRequests: unknown[] = [
      null,
      undefined,
      'ab'.repeat(32),
      123,
      {},
    ];

    for (const invalidRequest of invalidRequests) {
      expect(() =>
        service.signHashes('test-only-seed', invalidRequest)
      ).toThrowError('Unsigned hashes must be an array');
    }
    expect(cryptoService.seedHexToKeyPair).not.toHaveBeenCalled();
  });

  it('rejects empty and unreasonably large signing requests', () => {
    expect(() => service.signHashes('test-only-seed', [])).toThrowError(
      'At least one unsigned hash is required'
    );
    expect(() =>
      service.signHashes(
        'test-only-seed',
        Array.from({ length: 1001 }, () => 'ab'.repeat(32))
      )
    ).toThrowError('A maximum of 1000 hashes may be signed at once');
    expect(cryptoService.seedHexToKeyPair).not.toHaveBeenCalled();
  });

  it('rejects malformed hash values before accessing the private key', () => {
    const malformedHashes: unknown[] = [
      '',
      'ab'.repeat(31),
      'ab'.repeat(33),
      'a'.repeat(63),
      'zz'.repeat(32),
      `-${'01'.repeat(32)}`,
      123,
      null,
      ['ab'.repeat(32)],
      { length: -32 },
      '０１'.repeat(32),
    ];

    for (const malformedHash of malformedHashes) {
      expect(() =>
        service.signHashes('test-only-seed', [malformedHash])
      ).toThrowError(
        'Unsigned hash at index 0 must be exactly 32 bytes encoded as hexadecimal'
      );
    }
    expect(cryptoService.seedHexToKeyPair).not.toHaveBeenCalled();
  });

  it('applies the same validation to Ethereum signing', () => {
    expect(() =>
      service.signHashesETH('test-only-seed', [`-${'01'.repeat(32)}`])
    ).toThrowError(
      'Unsigned hash at index 0 must be exactly 32 bytes encoded as hexadecimal'
    );
    expect(cryptoService.seedHexToKeyPair).not.toHaveBeenCalled();
  });
});

import {TestBed} from '@angular/core/testing';

import {AccountService} from './account.service';
import {CookieModule} from 'ngx-cookie';
import {AccessLevel, Network} from '../types/identity';
import {CryptoService} from './crypto.service';
import * as bip39 from 'bip39';
import {GlobalVarsService} from './global-vars.service';

describe('AccountService', () => {
  let accountService: AccountService;
  let cryptoService: CryptoService;
  let globalVarsService: GlobalVarsService;

  const hostname = 'example.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ CryptoService, GlobalVarsService ],
      imports: [ CookieModule.forRoot() ],
    });

    accountService = TestBed.inject(AccountService);
    cryptoService = TestBed.inject(CryptoService);
    globalVarsService = TestBed.inject(GlobalVarsService);

    globalVarsService.hostname = hostname;
  });

  afterEach(() => {
    // clean up any leftover users
    deleteUsers(accountService);
  });

  it('should be created', () => {
    expect(accountService).toBeTruthy();
  });

  it('can add and remove users', () => {
    const numUsers = 10;
    for (let i = 0; i < numUsers; i++) {
      const newUser = mockUser(cryptoService);
      accountService.addUser(newUser);

      // adding the same user twice should be a no-op
      accountService.addUser(newUser);
    }

    expect(accountService.getPublicKeys().length).toEqual(numUsers);

    deleteUsers(accountService);
    expect(accountService.getPublicKeys.length).toEqual(0);
  });

  it('can set and revoke access', () => {
    const user = mockUser(cryptoService);
    const pubKey = accountService.addUser(user);

    // No access by default
    expect(accountService.getEncryptedUsers()).toEqual({});

    // Read-only access does not return encrypted seed
    accountService.setAccessLevel(pubKey, hostname, AccessLevel.ReadOnly);
    expect(accountService.getEncryptedUsers()).toEqual({
      [pubKey]: {
        hasExtraText: true,
        btcDepositAddress: user.btcDepositAddress,
        encryptedSeedHex: '',
        accessLevel: AccessLevel.ReadOnly,
        network: Network.mainnet,
      },
    });

    // Full access returns encrypted seed
    accountService.setAccessLevel(pubKey, hostname, AccessLevel.Full);
    expect(accountService.getEncryptedUsers()).toEqual({
      [pubKey]: {
        hasExtraText: true,
        btcDepositAddress: user.btcDepositAddress,
        encryptedSeedHex: cryptoService.encryptSeedHex(user.seedHex, hostname),
        accessLevel: AccessLevel.Full,
        network: Network.mainnet,
      },
    });

    // Revoking access works
    accountService.setAccessLevel(pubKey, hostname, AccessLevel.None);
    expect(accountService.getEncryptedUsers()).toEqual({});
  });
});

const deleteUsers = (accountService: AccountService) => {
  for (const publicKey of accountService.getPublicKeys()) {
    accountService.deleteUser(publicKey);
  }
};

const mockUser = (cryptoService: CryptoService) => {
  const network = Network.mainnet;
  const mnemonic = bip39.generateMnemonic();
  const extraText = 'testing';
  const keychain = cryptoService.mnemonicToKeychain(mnemonic, extraText);
  const seedHex = cryptoService.keychainToSeedHex(keychain);
  const btcDepositAddress = cryptoService.keychainToBtcAddress(keychain, network);

  return {
    seedHex,
    mnemonic,
    extraText,
    btcDepositAddress,
    network,
  };
};

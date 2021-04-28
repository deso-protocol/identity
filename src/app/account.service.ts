import {Injectable} from '@angular/core';
import {CryptoService} from './crypto.service';
import {GlobalVarsService} from './global-vars.service';
import {AccessLevel, Network, PrivateUserInfo, PublicUserInfo} from '../types/identity';
import {CookieService} from 'ngx-cookie';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private static usersStorageKey = 'users';
  private static levelsStorageKey = 'levels';

  constructor(
    private cryptoService: CryptoService,
    private globalVars: GlobalVarsService,
    private cookieService: CookieService,
  ) { }

  // Getters

  getPublicKeys(): any {
    return Object.keys(this.getPrivateUsers(this.globalVars.network));
  }

  getEncryptedUsers(): {[key: string]: PublicUserInfo} {
    const hostname = this.globalVars.hostname;
    const privateUsers = this.getPrivateUsers(this.globalVars.network);
    const publicUsers: {[key: string]: PublicUserInfo} = {};

    for (const publicKey of Object.keys(privateUsers)) {
      const privateUser = privateUsers[publicKey];
      const accessLevel = this.getAccessLevel(publicKey, hostname);
      if (accessLevel === AccessLevel.None) {
        continue;
      }

      const encryptedSeedHex = this.cryptoService.encryptSeedHex(privateUser.seedHex, hostname);
      const accessLevelHmac = this.cryptoService.accessLevelHmac(accessLevel, privateUser.seedHex);

      publicUsers[publicKey] = {
        hasExtraText: privateUser.extraText?.length > 0,
        btcDepositAddress: privateUser.btcDepositAddress,
        encryptedSeedHex,
        network: privateUser.network,
        accessLevel,
        accessLevelHmac,
      };
    }

    return publicUsers;
  }

  getAccessLevel(publicKey: string, hostname: string): AccessLevel {
    if (GlobalVarsService.noAccessHostnames.includes(hostname)) {
      return AccessLevel.None;
    }

    const levels = JSON.parse(localStorage.getItem(AccountService.levelsStorageKey) || '{}');
    const hostMapping = levels[hostname] || {};
    const accessLevel = hostMapping[publicKey];

    if (Object.values(AccessLevel).includes(accessLevel)) {
      return accessLevel;
    } else if (GlobalVarsService.fullAccessHostnames.includes(hostname)) {
      return AccessLevel.Full;
    } else {
      return AccessLevel.None;
    }
  }

  // Modifiers

  addUser(userInfo: PrivateUserInfo): string {
    const privateUsers = this.getPrivateUsers();
    const privateKey = this.cryptoService.seedHexToPrivateKey(userInfo.seedHex);
    const publicKey = this.cryptoService.privateKeyToBitcloutPublicKey(privateKey, userInfo.network);

    privateUsers[publicKey] = userInfo;

    localStorage.setItem(AccountService.usersStorageKey, JSON.stringify(privateUsers));

    return publicKey;
  }

  deleteUser(publicKey: string): void {
    const privateUsers = this.getPrivateUsers();

    delete privateUsers[publicKey];

    localStorage.setItem(AccountService.usersStorageKey, JSON.stringify(privateUsers));
  }

  setAccessLevel(publicKey: string, hostname: string, accessLevel: AccessLevel): void {
    const levels = JSON.parse(localStorage.getItem(AccountService.levelsStorageKey) || '{}');

    levels[hostname] ||= {};
    levels[hostname][publicKey] = accessLevel;

    localStorage.setItem(AccountService.levelsStorageKey, JSON.stringify(levels));
  }

  // Private / Sensitive

  private getPrivateUsers(network?: Network): {[key: string]: PrivateUserInfo} {
    const privateUsers = JSON.parse(localStorage.getItem(AccountService.usersStorageKey) || '{}');
    const filteredPrivateUsers: {[key: string]: PrivateUserInfo} = {};

    for (const publicKey of Object.keys(privateUsers)) {
      const privateUser = privateUsers[publicKey];
      if (network && privateUser.network !== network) {
        continue;
      }

      filteredPrivateUsers[publicKey] = privateUser;
    }

    return filteredPrivateUsers;
  }
}

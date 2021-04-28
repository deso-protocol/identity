import { Injectable } from '@angular/core';
import {AccessLevel, Network} from '../types/identity';
import {environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GlobalVarsService {
  static fullAccessHostnames = environment.fullAccessHostnames;
  static noAccessHostnames = environment.noAccessHostnames;

  network = Network.mainnet;
  hostname = '';
  accessLevelRequest = AccessLevel.ApproveAll;

  inTab = !!window.opener;

  constructor() { }

  isFullAccessHostname(): boolean {
    return GlobalVarsService.fullAccessHostnames.includes(this.hostname);
  }

  inFrame(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      // Most browsers block access to window.top when in an iframe
      return true;
    }
  }

  // tslint:disable-next-line:typedef
  get environment() {
    return environment;
  }
}

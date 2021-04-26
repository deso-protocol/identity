import { Injectable } from '@angular/core';
import {Network} from '../types/identity';

@Injectable({
  providedIn: 'root'
})
export class GlobalVarsService {
  static fullAccessHostnames = ['bitclout.com', 'bitclout.green'];
  static noAccessHostnames = [''];

  network = Network.mainnet;
  hostname = '';

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
}

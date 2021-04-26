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

  inTab = !!this.getOpener();

  constructor() { }

  isFullAccessHostname(): boolean {
    return GlobalVarsService.fullAccessHostnames.includes(this.hostname);
  }

  inFrame(): boolean {
    try {
      return this.getWindow().self !== this.getWindow().top;
    } catch (e) {
      // Most browsers block access to window.top when in an iframe
      return true;
    }
  }

  getWindow(): Window {
    return window;
  }

  getOpener(): Window {
    return this.getWindow().opener;
  }

  getParent(): Window {
    return this.getWindow().parent;
  }

  getCurrentWindow(): Window {
    // Opener can be null, parent is never null
    return this.getOpener() || this.getParent();
  }

}

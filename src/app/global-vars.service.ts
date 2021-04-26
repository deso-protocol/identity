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

  constructor() { }

  isFullAccessHostname(): boolean {
    return GlobalVarsService.fullAccessHostnames.includes(this.hostname);
  }

}

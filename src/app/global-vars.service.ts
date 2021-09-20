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
  webview = false;
  hideGoogle = false;
  hideJumio = false;

  jumioDeSoNanos: number = 0;
  referralUSDCents: number = 0;

  referralHashBase58: string = "";
  
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

  showJumio(): boolean {
    return environment.jumioSupported && !this.webview && !this.hideJumio;
  }

  nanosPerUSDExchangeRate: number = 0;
  nanosToDeSoMemo = {};

  nanosToDeSo(nanos: number, maximumFractionDigits: number = 2): string {
    if (!maximumFractionDigits && nanos > 0) {
      // maximumFractionDigits defaults to 3.
      // Set it higher only if we have very small amounts.
      maximumFractionDigits = Math.floor(10 - Math.log10(nanos));
    }

    // Always show at least 2 digits
    if (maximumFractionDigits < 2) {
      maximumFractionDigits = 2;
    }

    // Never show more than 9 digits
    if (maximumFractionDigits > 9) {
      maximumFractionDigits = 9;
    }

    // Always show at least 2 digits
    const minimumFractionDigits = 2;
    const num = nanos / 1e9;
    return Number(num).toLocaleString("en-US", {
      style: "decimal",
      currency: "USD",
      minimumFractionDigits,
      maximumFractionDigits,
    });
  }

  nanosToUSDNumber(nanos: number): number {
    return nanos / this.nanosPerUSDExchangeRate;
  }

  nanosToUSD(nanos: number, decimal?: number): string {
    if (decimal == null) {
      decimal = 4;
    }
    return this.formatUSD(this.nanosToUSDNumber(nanos), decimal);
  }

  formatUSD(num: number, decimal: number): string {
    return Number(num).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: decimal,
      maximumFractionDigits: decimal,
    });
  }

  getFreeDESOMessage(): string {
    return this.referralUSDCents ? this.formatUSD(this.referralUSDCents / 100, 0) : this.nanosToUSD(this.jumioDeSoNanos, 0);
  }
}

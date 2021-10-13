import {Component, OnInit} from '@angular/core';
import {GlobalVarsService} from './global-vars.service';
import {IdentityService} from './identity.service';
import {AccessLevel, Network} from '../types/identity';
import {getStateParamsFromGoogle} from './auth/google/google.component';
import {BackendAPIService} from './backend-api.service';
import { AccountService } from './account.service';

const IMPORTED_KEY = 'imported';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'identity';

  loading = true;
  importing = false;

  constructor(
    private accountService: AccountService,
    private globalVars: GlobalVarsService,
    private identityService: IdentityService,
    private backendApiService: BackendAPIService,
  ) { }

  ngOnInit(): void {
    // load params
    const params = new URLSearchParams(window.location.search);

    // grab hash parameters from window and not activatedRoute because init is run before detecting fragment
    let hashParams;
    if (window.location.hash && window.location.hash.length > 1){
      // hash includes the hashtag symbol so use substring to remove it
      hashParams = new URLSearchParams(window.location.hash.substring(1));
    }

    const accessLevelRequest = params.get('accessLevelRequest');
    if (accessLevelRequest) {
      this.globalVars.accessLevelRequest = parseInt(accessLevelRequest, 10);
    }

    const stateParamsFromGoogle = getStateParamsFromGoogle(hashParams);
    if (params.get('webview') || stateParamsFromGoogle.webview) {
      this.globalVars.webview = true;
    }

    if (params.get('testnet') || stateParamsFromGoogle.testnet) {
      this.globalVars.network = Network.testnet;
    }

    if (params.get('hideGoogle')) {
      this.globalVars.hideGoogle = true;
    }

    // Callback should only be used in mobile applications, where payload is passed through URL parameters.
    if (params.get('callback')) {
      try {
        this.globalVars.callback = new URL(params.get('callback') as string);
        this.globalVars.isCallbackValid = true;
      } catch (err) {
        console.error(err);
      }
    }

    if (params.get('hideJumio')) {
      this.globalVars.hideJumio = true;
    }

    const referralCode = params.get('referralCode');
    if (referralCode) {
      this.globalVars.referralHashBase58 = referralCode;
      this.backendApiService.GetReferralInfoForReferralHash(referralCode).subscribe((res) => {
        const referralInfo = res.ReferralInfoResponse.Info;
        if (
          res.ReferralInfoResponse.IsActive &&
          (referralInfo.TotalReferrals < referralInfo.MaxReferrals || referralInfo.MaxReferrals == 0)
        ) {
          this.globalVars.referralUSDCents = referralInfo.RefereeAmountUSDCents;
        }
      });
    }

    if (this.globalVars.callback !== null && this.globalVars.isCallbackValid) {
      // If callback is set, we won't be sending the initialize message.
      this.globalVars.hostname = 'localhost';
      this.finishInit();
    } else if (this.globalVars.webview || this.globalVars.inTab || this.globalVars.inFrame()) {
      // We must be running in a webview OR opened with window.open OR in an iframe to initialize
      this.identityService.initialize().subscribe(res => {
        this.globalVars.hostname = res.hostname;
        if (this.globalVars.isFullAccessHostname()) {
          this.globalVars.accessLevelRequest = AccessLevel.Full;
        }

        // We only care about attempting to import when we're in a tab.
        // The iframe doesn't have first party storage access and the webview
        // cannot open a window.
        if (this.globalVars.inTab && !localStorage.getItem(IMPORTED_KEY)) {
          this.importing = true;
        } else {
          this.finishInit();
        }
      });
    } else {
      // Identity currently doesn't have any management UIs that can be accessed directly
      window.location.href = `https://deso.org`;
    }

    this.backendApiService.GetAppState().subscribe((res) => {
      this.globalVars.jumioDeSoNanos = res.JumioDeSoNanos;
      this.globalVars.nanosPerUSDExchangeRate = 1e9 / (res.USDCentsPerDeSoExchangeRate / 100);
    });
  }

  finishInit(): void {
    // Migrate all accounts
    this.accountService.migrate();

    // Finish loading
    this.loading = false;
  }
  
  launchImport(): void {
    this.identityService.launchImportWindow().subscribe(() => {
      localStorage.setItem(IMPORTED_KEY, "true");
      this.importing = false;
      this.finishInit();
    });
  }
}

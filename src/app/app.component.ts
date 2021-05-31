import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {GlobalVarsService} from './global-vars.service';
import {IdentityService} from './identity.service';
import {AccessLevel, Network} from '../types/identity';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'identity';

  loading = true;

  constructor(
    private activatedRoute: ActivatedRoute,
    private globalVars: GlobalVarsService,
    private identityService: IdentityService,
  ) { }

  ngOnInit(): void {
    // load params
    const params = new URLSearchParams(window.location.search);
    const accessLevelRequest = params.get('accessLevelRequest');

    if (accessLevelRequest) {
      this.globalVars.accessLevelRequest = parseInt(accessLevelRequest, 10);
    }

    if (params.get('webview')) {
      this.globalVars.webview = true;
    }

    if (params.get('testnet')) {
      this.globalVars.network = Network.testnet;
    }

    if (this.globalVars.webview || this.globalVars.inTab || this.globalVars.inFrame()) {
      // We must be running in a webview OR opened with window.open OR in an iframe to initialize
      this.identityService.initialize().subscribe(res => {
        this.globalVars.hostname = res.hostname;
        if (this.globalVars.isFullAccessHostname()) {
          this.globalVars.accessLevelRequest = AccessLevel.Full;
        }

        this.loading = false;
      });
    } else {
      // Identity currently doesn't have any management UIs that can be accessed directly
      window.location.href = `https://${this.globalVars.environment.nodeHostname}`;
    }
  }
}

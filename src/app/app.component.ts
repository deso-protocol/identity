import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {GlobalVarsService} from './global-vars.service';
import {IdentityService} from './identity.service';
import {AccessLevel, Network} from '../types/identity';
import {skip} from 'rxjs/operators';

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
    // The first emission of queryParams is always empty as it starts with an empty BehaviourSubject
    this.activatedRoute.queryParams.pipe(skip(1)).subscribe(params => {
      // Store various parameters for duration of this session
      if (params.webview) {
        this.globalVars.webview = true;
      }

      if (params.testnet) {
        this.globalVars.network = Network.testnet;
      }

      if (params.accessLevelRequest) {
        this.globalVars.accessLevelRequest = parseInt(params.accessLevelRequest, 10);
      }

      // We must be in an iframe OR opened with window.open OR running in a webview
      if (!this.globalVars.webview && !this.globalVars.inTab && !this.globalVars.inFrame()) {
        window.location.href = `https://${this.globalVars.environment.nodeHostname}`;
        return;
      }

      this.identityService.initialize().subscribe(res => {
        this.globalVars.hostname = res.hostname;
        if (this.globalVars.isFullAccessHostname()) {
          this.globalVars.accessLevelRequest = AccessLevel.Full;
        }

        this.loading = false;
      });
    });
  }
}

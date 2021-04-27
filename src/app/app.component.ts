import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {GlobalVarsService} from './global-vars.service';
import {IdentityService} from './identity.service';
import {Network} from '../types/identity';

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
    // We must be in an iframe OR opened with window.open
    if (!this.globalVars.inTab && !this.globalVars.inFrame()) {
      window.location.href = `https://${this.globalVars.environment.nodeHostname}`;
      return;
    }

    this.identityService.initialize().subscribe(res => {
      this.globalVars.hostname = res.hostname;
      this.loading = false;
    });

    // Store testnet for duration of this session
    this.activatedRoute.queryParams.subscribe(params => {
      if (params.testnet) {
        this.globalVars.network = Network.testnet;
      }
    });
  }
}

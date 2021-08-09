import {Component, OnDestroy, OnInit, Input, Output, EventEmitter} from '@angular/core';
import {BackendAPIService} from '../backend-api.service';
import {CryptoService} from '../crypto.service';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {GlobalVarsService} from '../global-vars.service';
import {environment} from '../../environments/environment';
import {Router} from '@angular/router';
import {TextService} from '../text.service';
import {Network} from '../../types/identity';
import {RouteNames} from '../app-routing.module';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-jumio',
  templateUrl: './jumio.component.html',
  styleUrls: ['./jumio.component.scss']
})
export class JumioComponent implements OnInit, OnDestroy {

  @Input() publicKey: string = "";
  @Input() showSkip: boolean = true;
  @Input() autoOpenJumio: boolean = true;
  @Output() skipJumio = new EventEmitter();

  constructor(
    public backendApi: BackendAPIService,
    public globalVars: GlobalVarsService,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      if (params.public_key) {
        this.publicKey = params.public_key;
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.autoOpenJumio && this.publicKey) {
      this.openJumio();
    }
  }

  ngOnDestroy(): void {
  }

  getJumioURL(routeSuffix: string): string {
    const url = new URL(`${window.location.origin}/${routeSuffix}`)
    if (this.globalVars.network === Network.testnet) {
      url.searchParams.append('testnet', 'true');
    }
    url.searchParams.append('public_key', this.publicKey);
    const stateString = btoa(JSON.stringify({
      webview: this.globalVars.webview,
      testnet: this.globalVars.network === Network.testnet
    }));
    url.searchParams.append('state', stateString);
    return encodeURI(url.toString());
  }

  openJumio(): void {
    this.backendApi.JumioBegin(this.publicKey, this.getJumioURL(RouteNames.JUMIO_SUCCESS), this.getJumioURL(RouteNames.JUMIO_ERROR)).subscribe((res) => {
      window.location.href = res.URL;
    });
  }

  skip(): void {
    this.skipJumio.emit();
  }
}

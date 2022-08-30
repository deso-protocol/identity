import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import { BackendAPIService } from '../../backend-api.service';
import { IdentityService } from '../../identity.service';
import { AccountService } from '../../account.service';
import { ActivatedRoute, Router } from '@angular/router';
import { RouteNames } from '../../app-routing.module';

@Component({
  selector: 'buy-deso-complete-page',
  templateUrl: './buy-deso-complete-page.component.html',
  styleUrls: ['./buy-deso-complete-page.component.scss'],
})
export class BuyDeSoCompletePageComponent implements OnInit {
  publicKey = '';
  // TODO: handle buy more click.
  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private identityService: IdentityService,
    private accountService: AccountService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      this.publicKey = queryParams.publicKey;
    });
  }

  ngOnInit(): void {}

  onBuyMoreDeSoClicked(): void {
    this.router.navigate(['/', RouteNames.BUY_DESO], {
      queryParams: { publicKey: this.publicKey },
      queryParamsHandling: 'merge',
    });
  }
}

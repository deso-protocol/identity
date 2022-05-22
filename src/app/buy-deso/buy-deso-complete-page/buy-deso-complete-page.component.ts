import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import {BackendAPIService} from '../../backend-api.service';
import {IdentityService} from '../../identity.service';
import {AccountService} from '../../account.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'buy-deso-complete-page',
  templateUrl: './buy-deso-complete-page.component.html',
  styleUrls: ['./buy-deso-complete-page.component.scss'],
})
export class BuyDeSoCompleteComponent implements OnInit {
  publicKey = '';
  // TODO: handle buy more click.
  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private identityService: IdentityService,
    private accountService: AccountService,
    private activatedRoute: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((queryParams) => {
      this.publicKey = queryParams.publicKey;
    });
  }
}

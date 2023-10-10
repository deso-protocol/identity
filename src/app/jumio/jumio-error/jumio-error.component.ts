import { Component, OnDestroy, OnInit } from '@angular/core';
import { AccountService } from '../../account.service';
import { IdentityService } from '../../identity.service';
import { GlobalVarsService } from '../../global-vars.service';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-jumio-error',
  templateUrl: './jumio-error.component.html',
  styleUrls: ['./jumio-error.component.scss'],
})
export class JumioErrorComponent implements OnInit, OnDestroy {
  publicKey = '';
  hostname = '';
  constructor(
    public globalVars: GlobalVarsService,
    private activatedRoute: ActivatedRoute,
    private identityService: IdentityService,
    private accountService: AccountService
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.publicKey = params.public_key || '';
      this.hostname = globalVars.hostname;
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  async finishFlow() {
    const users = await this.accountService.getEncryptedUsers();
    this.identityService.login({
      users,
      publicKeyAdded: this.publicKey,
      signedUp: true,
      jumioSuccess: false,
    });
  }
}

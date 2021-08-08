import {Component, OnDestroy, OnInit} from '@angular/core';
import {AccountService} from '../../account.service';
import {IdentityService} from '../../identity.service';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-jumio-success',
  templateUrl: './jumio-success.component.html',
  styleUrls: ['./jumio-success.component.scss']
})
export class JumioSuccessComponent implements OnInit, OnDestroy {

  constructor(
    private activatedRoute: ActivatedRoute,
    private identityService: IdentityService,
    private accountService: AccountService,
  ) {
    this.activatedRoute.queryParams.subscribe(params => {
      // If Jumio succeeds, we close identity and send the login message.
      const publicKey = params.public_key || '';
      this.identityService.login({
        users: this.accountService.getEncryptedUsers(),
        publicKeyAdded: publicKey,
        signedUp: true,
        jumioSuccess: true,
        jumioInternalReference: params.customerInternalReference,
      });
    })
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
  }
}

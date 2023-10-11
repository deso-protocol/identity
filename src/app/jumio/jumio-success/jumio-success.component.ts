import { Component, OnDestroy, OnInit } from '@angular/core';
import { AccountService } from '../../account.service';
import { IdentityService } from '../../identity.service';
import { ActivatedRoute } from '@angular/router';
import { BackendAPIService } from 'src/app/backend-api.service';
import { forkJoin, from } from 'rxjs';

@Component({
  selector: 'app-jumio-success',
  templateUrl: './jumio-success.component.html',
  styleUrls: ['./jumio-success.component.scss'],
})
export class JumioSuccessComponent implements OnInit, OnDestroy {
  constructor(
    private activatedRoute: ActivatedRoute,
    private identityService: IdentityService,
    private accountService: AccountService,
    private backendApiService: BackendAPIService
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      // If Jumio succeeds, we close identity and send the login message.
      const publicKey = params.public_key || '';
      const jumioInternalReference = params.customerInternalReference || '';
      forkJoin([
        this.backendApiService.JumioFlowFinished(
          publicKey,
          jumioInternalReference
        ),
        from(this.accountService.getEncryptedUsers()),
      ]).subscribe(([_, encryptedUsers]) => {
        this.identityService.login({
          users: encryptedUsers,
          publicKeyAdded: publicKey,
          signedUp: true,
          jumioSuccess: true,
        });
      });
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {}
}

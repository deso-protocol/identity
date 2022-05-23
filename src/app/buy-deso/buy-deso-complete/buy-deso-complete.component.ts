import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import {BackendAPIService} from '../../backend-api.service';
import {IdentityService} from '../../identity.service';
import {AccountService} from '../../account.service';

@Component({
  selector: 'buy-deso-complete',
  templateUrl: './buy-deso-complete.component.html',
  styleUrls: ['./buy-deso-complete.component.scss'],
})
export class BuyDeSoCompleteComponent implements OnInit {
  @Input() publicKey = '';
  @Output() buyMoreDeSoClicked = new EventEmitter();
  @Output() closeModal = new EventEmitter();

  totalDeSoOwned = 0;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private identityService: IdentityService,
    private accountService: AccountService
  ) {}

  triggerBuyMoreDeSo(): void {
    this.buyMoreDeSoClicked.emit();
  }

  close(): void {
    this.closeModal.emit();
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      publicKeyAdded: this.publicKey,
      signedUp: this.globalVars.signedUp,
    });
  }

  ngOnInit(): void {
    this.backendApi.GetUsersStateless([this.publicKey], false)
      .subscribe( res => {
        if (!res.UserList.length) {
          return;
        }
        if (res.UserList[0].BalanceNanos) {
          this.totalDeSoOwned = res.UserList[0].BalanceNanos;
        }
      });

    window.scroll(0, 0);
  }
}

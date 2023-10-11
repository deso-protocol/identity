import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';
import { BackendAPIService } from '../../backend-api.service';
import { IdentityService } from '../../identity.service';
import { AccountService } from '../../account.service';

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

  async close() {
    this.closeModal.emit();
    const users = await this.accountService.getEncryptedUsers();
    this.identityService.login({
      users,
      publicKeyAdded: this.publicKey,
      signedUp: this.globalVars.signedUp,
    });
    window.close();
  }

  ngOnInit(): void {
    this.backendApi
      .GetUsersStateless([this.publicKey], true, true)
      .subscribe((res) => {
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

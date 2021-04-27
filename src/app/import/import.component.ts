import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {BackendAPIService} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {
  importUsers: {[key: string]: any} = {};

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService
  ) { }

  ngOnInit(): void {
    this.identityService.import().subscribe(res => {
      for (const identity of res.payload.identities) {
        this.accountService.addUser({
          seedHex: identity.SeedHex,
          mnemonic: identity.Mnemonic,
          extraText: identity.ExtraText,
          btcDepositAddress: identity.BtcDepositAddress,
          network: identity.Network,
        });
      }

      const publicKeys = this.accountService.getPublicKeys();

      this.backendApi.GetUsersStateless(publicKeys).subscribe(res2 => {
        for (const user of res2.UserList) {
          this.importUsers[user.PublicKeyBase58Check] = {
            username: user.ProfileEntryResponse?.Username,
            profilePic: user.ProfileEntryResponse?.ProfilePic,
          };
        }
      });
    });
  }

  allow(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
    });
  }

  deny(): void {
    this.identityService.login({
      users: {},
    });
  }
}

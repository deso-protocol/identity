import { Component, OnInit } from '@angular/core';
import { PrivateUserInfo } from 'src/types/identity';
import { GlobalVarsService } from '../global-vars.service';
import { IdentityService } from '../identity.service';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {

  constructor(
    private globalVars: GlobalVarsService,
    private identityService: IdentityService,
  ) { }

  ngOnInit(): void {
    // We will only import to identity.deso.org
    console.log(this.globalVars.hostname);
    if (this.globalVars.hostname !== 'identity.deso.org') {
      return;
    }

    this.identityService.import({
      privateUsers: this.getPrivateUsersRaw(),
    })
  }
  
  // Note: Never use this access pattern.
  //
  // We're only doing this because getPrivateUsers is private
  // and we don't want to change the signature of that method.
  //
  // We also want to import all users (testnet, mainnet, etc) and the
  // AccountService method filters out some users
  private getPrivateUsersRaw(): {[key: string]: PrivateUserInfo} {
    return JSON.parse(localStorage.getItem('users') || '{}');
  }

}

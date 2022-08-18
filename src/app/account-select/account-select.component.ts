import { Component, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { LoginMethod, UserProfile } from 'src/types/identity';
import { EventEmitter } from '@angular/core';
import { AccountService } from '../account.service';
import { RouteNames } from '../app-routing.module';
import { BackendAPIService } from '../backend-api.service';
import { GlobalVarsService } from '../global-vars.service';
import { IdentityService } from '../identity.service';

@Component({
  selector: 'app-account-select',
  templateUrl: './account-select.component.html',
  styleUrls: ['./account-select.component.scss'],
})
export class AccountSelectComponent implements OnInit {
  // Let people either pass in the users or default to calling it the standard way
  @Output() onAccountSelect: EventEmitter<string> = new EventEmitter();
  @Input() allUsers$: Observable<{ [key: string]: UserProfile }> =
    this.backendApi.GetUserProfiles(this.accountService.getPublicKeys());
  hasUsers = false;
  constructor(
    public accountService: AccountService,
    private backendApi: BackendAPIService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
  }

  public getLoginIcon(loginMethod: LoginMethod) {
    return {
      [LoginMethod.DESO]: 'assets/deso-logo.png',
      [LoginMethod.GOOGLE]: 'assets/google_logo.svg',
      [LoginMethod.METAMASK]: 'assets/metamask.png',
    }[loginMethod];
  }
}

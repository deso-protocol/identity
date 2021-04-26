import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CryptoService} from '../crypto.service';
import {IdentityService} from '../identity.service';
import {AccountService} from '../account.service';
import {AccessLevel} from '../../types/identity';
import {GlobalVarsService} from '../global-vars.service';

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.scss']
})
export class LogoutComponent implements OnInit {
  publicKey = '';
  logoutError = '';

  @ViewChild('seedText') seedText: ElementRef | undefined;
  @ViewChild('extraText') extraText: ElementRef | undefined;


  constructor(
    private activatedRoute: ActivatedRoute,
    private cryptoService: CryptoService,
    private identityService: IdentityService,
    private accountService: AccountService,
    public globalVars: GlobalVarsService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe(params => {
      this.publicKey = params.publicKey || '';
    });
  }

  onCancel(): void {
    this.finishFlow();
  }

  onSubmit(): void {
    this.accountService.setAccessLevel(this.publicKey, this.globalVars.hostname, AccessLevel.None);
    this.finishFlow();
  }

  finishFlow(): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
    });
  }

}

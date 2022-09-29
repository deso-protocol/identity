import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {IdentityService} from '../identity.service';
import {AccountService} from '../account.service';
import {CryptoService} from '../crypto.service';
import {SigningService} from '../signing.service';
import {GlobalVarsService} from '../global-vars.service';

@Component({
  selector: 'app-approve-jwt',
  templateUrl: './approve-jwt.component.html',
  styleUrls: ['./approve-jwt.component.scss']
})
export class ApproveJwtComponent implements OnInit {

  publicKey: any;

  constructor(
    private activatedRoute: ActivatedRoute,
    private identityService: IdentityService,
    private accountService: AccountService,
    private cryptoService: CryptoService,
    private signingService: SigningService,
    public globalVars: GlobalVarsService
  ) { }

  ngOnInit(): void {
      this.activatedRoute.queryParams.subscribe((params) => {
        this.publicKey = params.publicKey;
      });
  }

  onCancel(): void {
    this.finishFlow();
  }

  onSubmit(): void {
    const user = this.accountService.getEncryptedUsers()[this.publicKey];
    const isDerived = this.accountService.isMetamaskAccount(user);
    const jwt = this.signingService.signJWT(
      this.seedHex(),
      isDerived
    );
    this.finishFlow(jwt);
  }

  seedHex(): string {
    const encryptedSeedHex =
      this.accountService.getEncryptedUsers()[this.publicKey].encryptedSeedHex;
    return this.cryptoService.decryptSeedHex(
      encryptedSeedHex,
      this.globalVars.hostname
    );
  }

  finishFlow(jwt?: string): void {
    this.identityService.login({
      users: this.accountService.getEncryptedUsers(),
      jwt
    });
  }

}

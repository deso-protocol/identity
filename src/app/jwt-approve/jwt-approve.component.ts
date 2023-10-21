import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalVarsService } from '../global-vars.service';
import { IdentityService } from '../identity.service';

@Component({
  selector: 'app-jwt-approve',
  templateUrl: './jwt-approve.component.html',
  styleUrls: ['./jwt-approve.component.scss'],
})
export class JwtApproveComponent implements OnInit {
  publicKey: any;
  expirationDays = 30;

  constructor(
    private activatedRoute: ActivatedRoute,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.publicKey = params.publicKey;
      this.expirationDays = Number(params.expirationDays) || 30;
    });
  }

  onSubmit(): void {
    this.identityService.jwt({
      publicKey: this.publicKey,
      expirationDays: this.expirationDays,
    });
  }
}

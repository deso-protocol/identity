import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouteNames } from '../app-routing.module';
import { GlobalVarsService } from '../global-vars.service';
import { GoogleDriveService } from '../google-drive.service';
import { Network } from '../../types/identity';

@Component({
  selector: 'app-log-in-options',
  templateUrl: './log-in-options.component.html',
  styleUrls: ['./log-in-options.component.scss'],
})
export class LogInOptionsComponent implements OnInit {
  constructor(
    private googleDrive: GoogleDriveService,
    private router: Router,
    public globalVars: GlobalVarsService
  ) {}

  ngOnInit(): void {}

  launchGoogle(): void {
    this.googleDrive.launchGoogle();
  }

  navigateToMetamaskSignup(): void {
    this.router.navigate(['/', RouteNames.SIGN_UP_METAMASK], {
      queryParamsHandling: 'merge',
    });
  }

  navigateToGetDeso(publicKey: string): void {
    this.router.navigate(['/', RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
      queryParams: { publicKey },
    });
  }
}

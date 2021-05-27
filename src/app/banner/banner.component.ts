import { Component, OnInit } from '@angular/core';
import {GlobalVarsService} from '../global-vars.service';
import {Router} from "@angular/router";

@Component({
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.scss']
})
export class BannerComponent implements OnInit {

  constructor(
    public globalVars: GlobalVarsService,
    private router: Router,
  ) { }

  ngOnInit(): void {
  }

  isSignUpRoute(): boolean {
    return this.router.url.includes('/sign-up');
  }

  isLoginRoute(): boolean {
    return this.router.url.includes('/log-in-seed');
  }
}

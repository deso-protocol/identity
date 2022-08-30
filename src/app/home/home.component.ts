import { Component, OnInit } from '@angular/core';
import { CryptoService } from '../crypto.service';
import { AccountService } from '../account.service';
import { IdentityService } from '../identity.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor() {}
}

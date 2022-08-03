import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
  OnInit,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { GlobalVarsService } from '../global-vars.service';

@Component({
  selector: 'app-sign-up-buy-deso',
  templateUrl: './sign-up-buy-deso.component.html',
  styleUrls: ['./sign-up-buy-deso.component.scss'],
})
export class SignUpBuyDesoComponent implements OnInit {
  constructor(
    public globalVars: GlobalVarsService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle(`Buy $DESO - ${environment.hostname}`);
  }
}

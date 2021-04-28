import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EmbedComponent } from './embed/embed.component';
import { HomeComponent } from './home/home.component';
import {FormsModule} from '@angular/forms';
import {IdentityService} from './identity.service';
import {CookieModule} from 'ngx-cookie';
import { ImportComponent } from './import/import.component';
import { LogoutComponent } from './logout/logout.component';
import { BannerComponent } from './banner/banner.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { SignUpEntropyComponent } from './sign-up-entropy/sign-up-entropy.component';
import {AccountService} from './account.service';
import {EntropyService} from './entropy.service';
import { LogInComponent } from './log-in/log-in.component';
import {HttpClientModule} from '@angular/common/http';
import { ApproveComponent } from './approve/approve.component';

@NgModule({
  declarations: [
    AppComponent,
    EmbedComponent,
    HomeComponent,
    ImportComponent,
    LogoutComponent,
    BannerComponent,
    SignUpComponent,
    SignUpEntropyComponent,
    LogInComponent,
    ApproveComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    CookieModule.forRoot()
  ],
  providers: [
    IdentityService,
    EntropyService,
    AccountService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

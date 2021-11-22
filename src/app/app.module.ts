import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatFormFieldModule } from "@angular/material/form-field";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EmbedComponent } from './embed/embed.component';
import { HomeComponent } from './home/home.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {IdentityService} from './identity.service';
import {CookieModule} from 'ngx-cookie';
import { LogoutComponent } from './logout/logout.component';
import { BannerComponent } from './banner/banner.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import {AccountService} from './account.service';
import {EntropyService} from './entropy.service';
import { LogInComponent } from './log-in/log-in.component';
import {HttpClientModule} from '@angular/common/http';
import { ApproveComponent } from './approve/approve.component';
import { LogInSeedComponent } from './log-in-seed/log-in-seed.component';
import { GoogleComponent } from './auth/google/google.component';
import { AvatarDirective } from './avatar/avatar.directive';
import { DeriveComponent } from './derive/derive.component';
import { JumioComponent } from './jumio/jumio.component';
import { JumioSuccessComponent } from './jumio/jumio-success/jumio-success.component';
import { JumioErrorComponent } from './jumio/jumio-error/jumio-error.component';
import { ErrorCallbackComponent } from './error-callback/error-callback.component';
import { SharedSecretComponent } from './shared-secret/shared-secret.component';
import { SignUpGetStarterDESOComponent } from './sign-up-get-starter-deso/sign-up-get-starter-deso.component';
import { NgxIntlTelInputModule } from 'ngx-intl-tel-input';

@NgModule({
  declarations: [
    AppComponent,
    EmbedComponent,
    HomeComponent,
    LogoutComponent,
    BannerComponent,
    SignUpComponent,
    LogInComponent,
    ApproveComponent,
    LogInSeedComponent,
    GoogleComponent,
    AvatarDirective,
    DeriveComponent,
    JumioComponent,
    JumioSuccessComponent,
    JumioErrorComponent,
    ErrorCallbackComponent,
    SharedSecretComponent,
    SignUpGetStarterDESOComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    NgxIntlTelInputModule,
    MatFormFieldModule,
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

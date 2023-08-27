import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CookieModule } from 'ngx-cookie';
import { SanitizePostBodyPipe } from 'src/lib/pipes/sanitize-and-auto-link-pipe';
import { SanitizeVideoUrlPipe } from 'src/lib/pipes/sanitize-video-url-pipe';
import { TruncateAddressOrUsernamePipe } from 'src/lib/pipes/truncate-deso-address.pipe';
import { AccountSelectComponent } from './account-select/account-select.component';
import { AccountService } from './account.service';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ApproveComponent } from './approve/approve.component';
import { ArrowToggleComponent } from './arrow-toggle/arrow-toggle.component';
import { GoogleComponent } from './auth/google/google.component';
import { AvatarDirective } from './avatar/avatar.directive';
import { BannerComponent } from './banner/banner.component';
import { BuyDeSoCompletePageComponent } from './buy-deso/buy-deso-complete-page/buy-deso-complete-page.component';
import { BuyDesoPageComponent } from './buy-deso/buy-deso-page/buy-deso-page.component';
import { BuyDeSoComponentWrapper } from './buy-deso/buy-deso/buy-deso.component';
import { BuyOrSendDesoComponent } from './buy-or-send-deso/buy-or-send-deso.component';
import { DeriveComponent } from './derive/derive.component';
import { EmbedComponent } from './embed/embed.component';
import { EntropyService } from './entropy.service';
import { ErrorCallbackComponent } from './error-callback/error-callback.component';
import { FreeDeSoDisclaimerComponent } from './free-deso-message/free-deso-disclaimer/free-deso-disclaimer.component';
import { FreeDesoMessageComponent } from './free-deso-message/free-deso-message.component';
import { GetDesoComponent } from './get-deso/get-deso.component';
import { HomeComponent } from './home/home.component';
import { IconsModule } from './icons/icons.module';
import { IdentityService } from './identity.service';
import { JumioErrorComponent } from './jumio/jumio-error/jumio-error.component';
import { JumioSuccessComponent } from './jumio/jumio-success/jumio-success.component';
import { JumioComponent } from './jumio/jumio.component';
import { LogInOptionsComponent } from './log-in-options/log-in-options.component';
import { LogInSeedComponent } from './log-in-seed/log-in-seed.component';
import { LogInComponent } from './log-in/log-in.component';
import { LogoutComponent } from './logout/logout.component';
import { MessagingGroupComponent } from './messaging-group/messaging-group.component';
import { MetamaskService } from './metamask.service';
import { SharedSecretComponent } from './shared-secret/shared-secret.component';
import { SignUpGetStarterDESOComponent } from './sign-up-get-starter-deso/sign-up-get-starter-deso.component';
import { SignUpMetamaskComponent } from './sign-up-metamask/sign-up-metamask.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import {
  TransactionSpendingLimitAccessGroupMemberComponent
} from './transaction-spending-limit/transaction-spending-limit-access-group-member/transaction-spending-limit-access-group-member.component';
import {
  TransactionSpendingLimitAccessGroupComponent
} from './transaction-spending-limit/transaction-spending-limit-access-group/transaction-spending-limit-access-group.component';
import {
  TransactionSpendingLimitAssociationComponent
} from './transaction-spending-limit/transaction-spending-limit-association/transaction-spending-limit-association.component';
import {
  TransactionSpendingLimitCoinComponent
} from './transaction-spending-limit/transaction-spending-limit-coin/transaction-spending-limit-coin.component';
import {
  TransactionSpendingLimitDaoCoinLimitOrderComponent
} from './transaction-spending-limit/transaction-spending-limit-dao-coin-limit-order/transaction-spending-limit-dao-coin-limit-order.component';
import {
  TransactionSpendingLimitNftComponent
} from './transaction-spending-limit/transaction-spending-limit-nft/transaction-spending-limit-nft.component';
import {
  TransactionSpendingLimitSectionComponent
} from './transaction-spending-limit/transaction-spending-limit-section/transaction-spending-limit-section.component';
import { TransactionSpendingLimitComponent } from './transaction-spending-limit/transaction-spending-limit.component';
import { NgHcaptchaModule } from 'ng-hcaptcha';
import {environment} from "../environments/environment";

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
    FreeDesoMessageComponent,
    FreeDeSoDisclaimerComponent,
    TransactionSpendingLimitComponent,
    TransactionSpendingLimitSectionComponent,
    TransactionSpendingLimitCoinComponent,
    TransactionSpendingLimitNftComponent,
    SanitizePostBodyPipe,
    SanitizeVideoUrlPipe,
    TransactionSpendingLimitDaoCoinLimitOrderComponent,
    GetDesoComponent,
    BuyDeSoCompletePageComponent,
    BuyDesoPageComponent,
    BuyOrSendDesoComponent,
    SignUpMetamaskComponent,
    ArrowToggleComponent,
    TruncateAddressOrUsernamePipe,
    LogInOptionsComponent,
    AccountSelectComponent,
    MessagingGroupComponent,
    TransactionSpendingLimitAssociationComponent,
    TransactionSpendingLimitAccessGroupComponent,
    TransactionSpendingLimitAccessGroupMemberComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatTooltipModule,
    IconsModule,
    NgHcaptchaModule.forRoot({
      siteKey: environment.hCaptchaSitekey,
    }),
    BuyDeSoComponentWrapper,
    CookieModule.forRoot(),
  ],
  providers: [
    IdentityService,
    EntropyService,
    AccountService,
    MetamaskService,
    TruncateAddressOrUsernamePipe,
  ],

  bootstrap: [AppComponent],
})
export class AppModule {
}

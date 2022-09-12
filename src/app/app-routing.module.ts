import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EmbedComponent } from './embed/embed.component';
import { HomeComponent } from './home/home.component';
import { LogoutComponent } from './logout/logout.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { LogInComponent } from './log-in/log-in.component';
import { ApproveComponent } from './approve/approve.component';
import { LogInSeedComponent } from './log-in-seed/log-in-seed.component';
import { GoogleComponent } from './auth/google/google.component';
import { DeriveComponent } from './derive/derive.component';
import { SharedSecretComponent } from './shared-secret/shared-secret.component';
import { SignUpGetStarterDESOComponent } from './sign-up-get-starter-deso/sign-up-get-starter-deso.component';
import { GetDesoComponent } from './get-deso/get-deso.component';
import { BuyDesoPageComponent } from './buy-deso/buy-deso-page/buy-deso-page.component';
import { BuyDeSoCompletePageComponent } from './buy-deso/buy-deso-complete-page/buy-deso-complete-page.component';
import { BuyOrSendDesoComponent } from './buy-or-send-deso/buy-or-send-deso.component';
import { SignUpMetamaskComponent } from './sign-up-metamask/sign-up-metamask.component';
import { MessagingGroupComponent } from './messaging-group/messaging-group.component';

export class RouteNames {
  public static EMBED = 'embed';
  public static LOGOUT = 'logout';
  public static SIGN_UP = 'sign-up';
  public static SIGN_UP_METAMASK = 'sign-up-metamask';
  public static LOG_IN = 'log-in';
  public static LOAD_SEED = 'load-seed';
  public static APPROVE = 'approve';
  public static AUTH_GOOGLE = 'auth/google';
  public static DERIVE = 'derive';
  public static JUMIO_SUCCESS = 'jumio-success';
  public static JUMIO_ERROR = 'jumio-error';
  public static GET_FREE_DESO = 'get-free-deso';
  public static VERIFY_PHONE_NUMBER = 'verify-phone-number';
  public static GET_SHARED_SECRETS = 'get-shared-secrets';
  // Deprecated route - redirects to get-free-deso
  public static GET_FREE_CLOUT = 'get-free-clout';
  public static BUY_COMPLETE = 'buy-complete';
  public static GET_DESO = 'get-deso';
  public static BUY_DESO = 'buy-deso';
  public static BUY_OR_SEND_DESO = 'buy-or-send-deso';
  public static MESSAGING_GROUP = 'messaging-group';
}

const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: RouteNames.EMBED, component: EmbedComponent, pathMatch: 'full' },
  { path: RouteNames.LOGOUT, component: LogoutComponent, pathMatch: 'full' },
  { path: RouteNames.SIGN_UP, component: SignUpComponent, pathMatch: 'full' },
  {
    path: RouteNames.SIGN_UP_METAMASK,
    component: SignUpMetamaskComponent,
    pathMatch: 'full',
  },
  { path: RouteNames.LOG_IN, component: LogInComponent, pathMatch: 'full' },
  {
    path: RouteNames.LOAD_SEED,
    component: LogInSeedComponent,
    pathMatch: 'full',
  },
  { path: RouteNames.APPROVE, component: ApproveComponent, pathMatch: 'full' },
  {
    path: RouteNames.AUTH_GOOGLE,
    component: GoogleComponent,
    pathMatch: 'full',
  },
  { path: RouteNames.DERIVE, component: DeriveComponent, pathMatch: 'full' },
  {
    path: RouteNames.GET_SHARED_SECRETS,
    component: SharedSecretComponent,
    pathMatch: 'full',
  },
  {
    path: RouteNames.VERIFY_PHONE_NUMBER,
    component: SignUpGetStarterDESOComponent,
    pathMatch: 'full',
  },
  {
    path: RouteNames.BUY_COMPLETE,
    component: BuyDeSoCompletePageComponent,
    pathMatch: 'full',
  },
  { path: RouteNames.GET_DESO, component: GetDesoComponent, pathMatch: 'full' },
  {
    path: RouteNames.BUY_DESO,
    component: BuyDesoPageComponent,
    pathMatch: 'full',
  },
  {
    path: RouteNames.BUY_OR_SEND_DESO,
    component: BuyOrSendDesoComponent,
    pathMatch: 'full',
  },
  {
    path: RouteNames.MESSAGING_GROUP,
    component: MessagingGroupComponent,
    pathMatch: 'full',
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

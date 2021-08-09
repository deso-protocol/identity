import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {EmbedComponent} from './embed/embed.component';
import {HomeComponent} from './home/home.component';
import {LogoutComponent} from './logout/logout.component';
import {SignUpComponent} from './sign-up/sign-up.component';
import {LogInComponent} from './log-in/log-in.component';
import {ApproveComponent} from './approve/approve.component';
import {LogInSeedComponent} from './log-in-seed/log-in-seed.component';
import {GoogleComponent} from './auth/google/google.component';
import {JumioSuccessComponent} from './jumio/jumio-success/jumio-success.component';
import {JumioErrorComponent} from './jumio/jumio-error/jumio-error.component';
import {JumioComponent} from './jumio/jumio.component';

export class RouteNames {
  public static EMBED = 'embed';
  public static LOGOUT = 'logout';
  public static SIGN_UP = 'sign-up';
  public static LOG_IN = 'log-in';
  public static LOAD_SEED = 'load-seed';
  public static APPROVE = 'approve';
  public static AUTH_GOOGLE = 'auth/google';
  public static JUMIO_SUCCESS = 'jumio-success';
  public static JUMIO_ERROR = 'jumio-error';
  public static GET_FREE_CLOUT = 'get-free-clout';
}

const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: RouteNames.EMBED, component: EmbedComponent, pathMatch: 'full' },
  { path: RouteNames.LOGOUT, component: LogoutComponent, pathMatch: 'full' },
  { path: RouteNames.SIGN_UP, component: SignUpComponent, pathMatch: 'full' },
  { path: RouteNames.LOG_IN, component: LogInComponent, pathMatch: 'full' },
  { path: RouteNames.LOAD_SEED, component: LogInSeedComponent, pathMatch: 'full' },
  { path: RouteNames.APPROVE, component: ApproveComponent, pathMatch: 'full' },
  { path: RouteNames.AUTH_GOOGLE, component: GoogleComponent, pathMatch: 'full' },
  { path: RouteNames.JUMIO_SUCCESS, component: JumioSuccessComponent, pathMatch: 'full'},
  { path: RouteNames.JUMIO_ERROR, component: JumioErrorComponent, pathMatch: 'full' },
  { path: RouteNames.GET_FREE_CLOUT, component: JumioComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

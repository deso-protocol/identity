import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {EmbedComponent} from './embed/embed.component';
import {HomeComponent} from './home/home.component';
import {ImportComponent} from './import/import.component';
import {LogoutComponent} from './logout/logout.component';
import {SignUpComponent} from './sign-up/sign-up.component';
import {LogInComponent} from './log-in/log-in.component';
import {ApproveComponent} from './approve/approve.component';
import {LogInSeedComponent} from './log-in-seed/log-in-seed.component';
import {GoogleComponent} from "./auth/google/google.component";

export class RouteNames {
  public static EMBED = 'embed';
  public static IMPORT = 'import';
  public static LOGOUT = 'logout';
  public static SIGN_UP = 'sign-up';
  public static LOG_IN = 'log-in';
  public static LOAD_SEED = 'load-seed';
  public static APPROVE = 'approve';
  public static AUTH_GOOGLE = 'auth/google'
}

const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: RouteNames.EMBED, component: EmbedComponent, pathMatch: 'full' },
  { path: RouteNames.IMPORT, component: ImportComponent, pathMatch: 'full' },
  { path: RouteNames.LOGOUT, component: LogoutComponent, pathMatch: 'full' },
  { path: RouteNames.SIGN_UP, component: SignUpComponent, pathMatch: 'full' },
  { path: RouteNames.LOG_IN, component: LogInComponent, pathMatch: 'full' },
  { path: RouteNames.LOAD_SEED, component: LogInSeedComponent, pathMatch: 'full' },
  { path: RouteNames.APPROVE, component: ApproveComponent, pathMatch: 'full' },
  { path: RouteNames.AUTH_GOOGLE, component: GoogleComponent, pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

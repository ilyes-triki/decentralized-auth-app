import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { WalletSetup } from './pages/wallet-setup/wallet-setup';
import { AccountBlocked } from './pages/account-blocked/account-blocked';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { loginGuard } from './core/guards/login-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'wallet-setup', component: WalletSetup, canActivate: [loginGuard] },
  { path: 'account-blocked', component: AccountBlocked },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  {
    path: 'admin',
    redirectTo: 'admin/overview',
    pathMatch: 'full',
  },
  {
    path: 'admin/:section',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard],
  },
  { path: '**', redirectTo: '' },
];

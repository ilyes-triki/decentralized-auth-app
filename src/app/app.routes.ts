import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
import { WalletSetup } from './pages/wallet-setup/wallet-setup';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { loginGuard } from './core/guards/login-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'login', component: Login, canActivate: [loginGuard] },
  { path: 'wallet-setup', component: WalletSetup, canActivate: [loginGuard] },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
  {
    path: 'admin',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard],
  },
  { path: '**', redirectTo: '' },
];

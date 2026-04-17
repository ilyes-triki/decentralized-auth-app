import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { loginGuard } from './core/guards/login-guard';

export const routes: Routes = [
  { path: '', component: Login, canActivate: [loginGuard], runGuardsAndResolvers: 'always' },

  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard],
  },

  {
    path: 'admin',
    component: AdminDashboard,
    canActivate: [authGuard, roleGuard],
  },
];

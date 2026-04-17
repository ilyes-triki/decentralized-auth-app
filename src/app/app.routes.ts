import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Profile } from './pages/profile/profile';
import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'profile', component: Profile },
  { path: 'admin', component: AdminDashboard },
];

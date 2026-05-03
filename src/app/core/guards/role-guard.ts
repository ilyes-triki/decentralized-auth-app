import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export const roleGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.getUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role !== 'admin') {
    router.navigate(['/profile']);
    return false;
  }

  return true;
};

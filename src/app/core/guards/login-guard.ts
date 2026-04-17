import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export const loginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();

  if (user) {
    if (user.role === 'admin') {
      router.navigate(['/admin']);
    } else {
      router.navigate(['/profile']);
    }
    return false;
  }

  return true;
};

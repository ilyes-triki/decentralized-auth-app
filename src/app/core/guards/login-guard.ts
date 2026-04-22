import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export const loginGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.getUser()) {
    router.navigate(['/profile']);
    return false;
  }

  return true;
};

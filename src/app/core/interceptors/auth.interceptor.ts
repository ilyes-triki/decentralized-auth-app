import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { catchError, throwError } from 'rxjs';

/**
 * Attaches Bearer token to protected API calls. Public auth endpoints are left unchanged.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  const handleBlocked = (stream: ReturnType<typeof next>) =>
    stream.pipe(
      catchError((err) => {
        const code = err?.error?.errorCode;
        if (code === 'ACCOUNT_BLOCKED') {
          const wallet = auth.getUser()?.address;
          const email = err?.error?.email;
          auth.logout();
          void router.navigate(['/account-blocked'], {
            queryParams: { ...(wallet ? { wallet } : {}), ...(email ? { email } : {}) },
          });
        }
        return throwError(() => err);
      }),
    );
  if (!token) return handleBlocked(next(req));
  const url = req.url;
  if (url.includes('/api/auth/')) {
    return handleBlocked(next(req));
  }
  if (url.includes('/api/profile') || url.includes('/api/admin')) {
    return handleBlocked(next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })));
  }
  return handleBlocked(next(req));
};

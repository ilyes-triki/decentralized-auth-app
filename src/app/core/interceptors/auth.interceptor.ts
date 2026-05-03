import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth';

/**
 * Attaches Bearer token to protected API calls. Public auth endpoints are left unchanged.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getToken();
  if (!token) {
    return next(req);
  }
  const url = req.url;
  if (url.includes('/api/auth/')) {
    return next(req);
  }
  if (url.includes('/api/profile') || url.includes('/api/admin')) {
    return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
  return next(req);
};

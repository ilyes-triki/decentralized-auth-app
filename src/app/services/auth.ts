import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { AuthUser, UserRole } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private userSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  user$ = this.userSubject.asObservable();

  private isValidRole(value: unknown): value is UserRole {
    return value === 'admin' || value === 'user';
  }

  private isAuthUser(value: unknown): value is AuthUser {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const maybeUser = value as Record<string, unknown>;
    return (
      typeof maybeUser['address'] === 'string' &&
      this.isValidRole(maybeUser['role']) &&
      (maybeUser['token'] === undefined || typeof maybeUser['token'] === 'string')
    );
  }

  private getStoredUser(): AuthUser | null {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem('user');
    if (!data) return null;

    try {
      const parsed: unknown = JSON.parse(data);
      return this.isAuthUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private setStoredUser(user: AuthUser | null) {
    if (!this.isBrowser) return;
    user ? localStorage.setItem('user', JSON.stringify(user)) : localStorage.removeItem('user');
  }

  loginWithWallet(address: string, role: UserRole, token?: string) {
    const user: AuthUser = { address, role, token };
    this.setStoredUser(user);
    this.userSubject.next(user);
  }

  getToken(): string | null {
    return this.getUser()?.token ?? null;
  }

  getUser(): AuthUser | null {
    return this.userSubject.value;
  }

  isLoggedIn() {
    return !!this.userSubject.value;
  }

  isAdmin(): boolean {
    return this.getUser()?.role === 'admin';
  }

  logout() {
    this.setStoredUser(null);
    this.userSubject.next(null);
  }
}

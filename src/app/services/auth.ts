import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private userSubject = new BehaviorSubject<any>(this.getStoredUser());
  user$ = this.userSubject.asObservable();

  private getStoredUser() {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  }

  private setStoredUser(user: any) {
    if (!this.isBrowser) return;
    user ? localStorage.setItem('user', JSON.stringify(user)) : localStorage.removeItem('user');
  }

  loginWithWallet(wallet: string, signature: string) {
    const user = { wallet, role: 'user', signature };
    this.setStoredUser(user);
    this.userSubject.next(user);
  }

  getUser() {
    return this.userSubject.value;
  }

  isLoggedIn() {
    return !!this.userSubject.value;
  }

  logout() {
    this.setStoredUser(null);
    this.userSubject.next(null);
  }
}

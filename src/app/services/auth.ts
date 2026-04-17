import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
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

    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }

  loginAsUser() {
    const user = { wallet: '0xUSER123', role: 'user' };
    this.setStoredUser(user);
    this.userSubject.next(user);
  }

  loginAsAdmin() {
    const user = { wallet: '0xADMIN456', role: 'admin' };
    this.setStoredUser(user);
    this.userSubject.next(user);
  }

  getUser() {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  logout() {
    this.setStoredUser(null);
    this.userSubject.next(null);
  }
  loginWithWallet(wallet: string, signature?: string) {
    const user = { wallet, role: 'user', signature };
    this.setStoredUser(user);
    this.userSubject.next(user);
  }
}

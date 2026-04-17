import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  user$ = this.userSubject.asObservable();

  loginAsUser() {
    this.userSubject.next({
      wallet: '0xUSER123',
      role: 'user',
    });
  }

  loginAsAdmin() {
    this.userSubject.next({
      wallet: '0xADMIN456',
      role: 'admin',
    });
  }

  getUser() {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return this.userSubject.value !== null;
  }

  logout() {
    this.userSubject.next(null);
  }
}

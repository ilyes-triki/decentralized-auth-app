import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  template: `
    @if (auth.isLoggedIn()) {
      <nav>
        <button (click)="goProfile()">Profile</button>
        <button (click)="goAdmin()">Admin</button>
        <button (click)="logout()">Logout</button>
      </nav>
    }
  `,
})
export class Navbar {
  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  goProfile() {
    this.router.navigate(['/profile']);
  }
  goAdmin() {
    this.router.navigate(['/admin']);
  }
  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

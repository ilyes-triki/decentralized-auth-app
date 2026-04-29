import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.html',
})
export class Profile {
  private router = inject(Router); // 🔥 stronger injection
  constructor(public auth: AuthService) {}

  get user() {
    return this.auth.getUser();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

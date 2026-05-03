import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  logout() {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}

import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}
  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/', { replaceUrl: true });
  }
}

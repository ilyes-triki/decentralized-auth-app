import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  template: `
    <div>
      <h1>User Profile</h1>
      <p>Wallet: {{ user?.wallet }}</p>
      <p>Role: {{ user?.role }}</p>
      <button (click)="logout()">Logout</button>
    </div>
  `,
})
export class Profile {
  user: any;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.user = user;
    });
  }
  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/', { replaceUrl: true });
  }
}

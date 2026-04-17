import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  template: `
    <div class="container">
      <h1>Admin Dashboard</h1>

      <p>Wallet: {{ user?.wallet }}</p>
      <p>Role: {{ user?.role }}</p>

      <table border="1">
        <tr>
          <th>Wallet</th>
          <th>Login Time</th>
          <th>Status</th>
        </tr>
        <tr>
          <td>{{ user?.wallet }}</td>
          <td>Now</td>
          <td>Success</td>
        </tr>
      </table>

      <button (click)="logout()">Logout</button>
    </div>
  `,
})
export class AdminDashboard {
  user: any;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    this.user = this.authService.getUser();
  }
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

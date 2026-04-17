import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  goToProfile() {
    this.authService.loginAsUser();
    setTimeout(() => {
      this.router.navigate(['/profile']);
    }, 0);
  }

  goToAdmin() {
    this.authService.loginAsAdmin();
    setTimeout(() => {
      this.router.navigate(['/admin']);
    }, 0);
  }
  ngOnInit() {
    const user = this.authService.getUser();

    if (user) {
      if (user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/profile']);
      }
    }
  }
}

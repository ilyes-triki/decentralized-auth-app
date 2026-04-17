import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Web3Service } from '../../services/web3';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService,

    private web3Service: Web3Service,
  ) {}

  async connectWallet() {
    const result = await this.web3Service.connectAndSign();

    if (result) {
      const user = {
        wallet: result.address,
        role: 'user',
        signature: result.signature,
      };

      this.authService.loginWithWallet(result.address, result.signature);

      console.log('SIGNED:', result);

      this.router.navigate(['/profile']);
    }
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

  redirectIfLoggedIn() {
    const user = this.authService.getUser();

    if (user) {
      if (user.role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/profile']);
      }
    }
  }

  goToProfile() {
    this.authService.loginAsUser();
    this.router.navigate(['/profile']);
  }

  goToAdmin() {
    this.authService.loginAsAdmin();
    this.router.navigate(['/admin']);
  }
}

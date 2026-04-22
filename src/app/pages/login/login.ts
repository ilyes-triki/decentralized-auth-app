import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Web3Service } from '../../services/web3';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
})
export class Login implements OnInit {
  constructor(
    private router: Router,
    private auth: AuthService,
    private web3: Web3Service,
  ) {}

  ngOnInit() {
    if (this.auth.getUser()) {
      this.router.navigate(['/profile']);
    }
  }

  async connectWallet() {
    const result = await this.web3.connectAndSign();
    if (result) {
      this.auth.loginWithWallet(result.address, result.signature);
      this.router.navigate(['/profile']);
    }
  }
}

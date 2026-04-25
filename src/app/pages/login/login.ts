import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Web3Service } from '../../services/web3';
import { ApiService } from '../../services/api';

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
    private api: ApiService,
  ) {}

  ngOnInit() {
    if (this.auth.getUser()) {
      this.router.navigate(['/profile']);
    }
  }
  isConnecting = false;
  async connectWallet() {
    const accounts = await this.web3.connectWalletOnly();

    if (!accounts) return;

    const address = accounts[0];

    const message = await this.api.getNonce(address);

    const signature = await this.web3.signMessage(address, message);

    try {
      const response = await this.api.login(address, signature, message);

      this.auth.loginWithWallet(response.address, response.role);
      this.router.navigate(['/profile']);
    } catch (err) {
      console.error(err);
      alert('Authentication failed');
    }
  }
}

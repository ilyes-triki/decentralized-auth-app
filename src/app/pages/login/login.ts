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
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      console.log('STEP 1: Connecting wallet...');
      const accounts = await this.web3.connectWalletOnly();

      const address = accounts[0];
      console.log('ADDRESS:', address);

      console.log('STEP 2: Getting nonce...');
      const message = await this.api.getNonce(address);
      console.log('NONCE:', message);

      console.log('STEP 3: Signing...');
      const signature = await this.web3.signMessage(address, message);
      console.log('SIGNATURE:', signature);

      console.log('STEP 4: Sending to backend...');
      const response = await this.api.login(address, signature, message);
      console.log('BACKEND RESPONSE:', response);

      this.auth.loginWithWallet(response.address, response.role);
      this.router.navigate(['/profile']);
    } catch (err) {
      console.error('ERROR:', err);
      alert('Authentication failed');
    } finally {
      this.isConnecting = false;
    }
  }
}

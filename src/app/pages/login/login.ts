import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { Web3Service } from '../../services/web3';
import { ApiService } from '../../services/api';
import { toUserMessage } from '../../services/error-handler';
import { ToastService } from '../../services/toast.service';
import { ErrorBanner } from '../../shared/error-banner/error-banner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ErrorBanner],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  constructor(
    private router: Router,
    private auth: AuthService,
    private web3: Web3Service,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    if (this.auth.getUser()) {
      this.router.navigate(['/profile']);
      return;
    }

    this.hasWalletProvider = this.web3.hasEthereumProvider();
  }
  isConnecting = false;
  errorMessage = '';
  hasWalletProvider = true;

  private getDisplayError(error: unknown): string {
    if (error && typeof error === 'object' && 'code' in error && error.code === 4001) {
      return 'Wallet request was rejected.';
    }

    if (error instanceof Error) {
      if (error.message === 'Ethereum provider not found') {
        return 'MetaMask is not available in this browser.';
      }

      if (error.message === 'Invalid wallet accounts response') {
        return 'Wallet did not return a valid account list.';
      }

      if (error.message === 'Invalid signature response') {
        return 'Wallet did not return a valid signature.';
      }

      if (error.message.trim().length > 0) {
        return error.message;
      }
    }

    return toUserMessage(error, 'Authentication failed. Please try again.');
  }

  async connectWallet() {
    if (this.isConnecting) return;
    if (!this.web3.hasEthereumProvider()) {
      this.hasWalletProvider = false;
      this.router.navigate(['/wallet-setup']);
      return;
    }

    this.errorMessage = '';
    this.isConnecting = true;

    try {
      const accounts = await this.web3.connectWalletOnly();

      const address = accounts[0];
      if (!address) {
        throw new Error('Invalid wallet accounts response');
      }

      const message = await this.api.getNonce(address);

      const signature = await this.web3.signMessage(address, message);

      const response = await this.api.login(address, signature, message);

      this.auth.loginWithWallet(response.address, response.role, response.token);
      this.toast.success('Signed in successfully.');
      this.router.navigate(['/profile']);
    } catch (err) {
      this.errorMessage = this.getDisplayError(err);
      const short =
        this.errorMessage.length > 100 ? `${this.errorMessage.slice(0, 97)}…` : this.errorMessage;
      this.toast.error(short);
      console.error('Authentication error:', err);
    } finally {
      this.isConnecting = false;
    }
  }
}

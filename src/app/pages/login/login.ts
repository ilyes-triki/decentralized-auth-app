import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [RouterLink, ErrorBanner, FormsModule],
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
      void this.router.navigate(['/profile']);
      return;
    }

    this.hasWalletProvider = this.web3.hasEthereumProvider();
  }

  loginStep: 1 | 2 | 3 = 1;
  email = '';
  otp = '';
  emailTicket = '';
  isSendingOtp = false;
  isVerifyingOtp = false;
  isConnecting = false;
  errorMessage = '';
  hasWalletProvider = true;
  private lastWalletAttempted = '';

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

  private isAccountBlockedError(error: unknown): boolean {
    const msg = this.getDisplayError(error).toUpperCase();
    return msg.includes('ACCOUNT_BLOCKED');
  }

  async sendEmailCode(): Promise<void> {
    if (this.isSendingOtp) return;
    this.errorMessage = '';
    this.isSendingOtp = true;
    try {
      await this.api.startEmailOtp(this.email.trim());
      this.toast.success('Verification code sent (see server logs in dev).');
      this.loginStep = 2;
    } catch (err) {
      this.errorMessage = this.getDisplayError(err);
      const short =
        this.errorMessage.length > 100 ? `${this.errorMessage.slice(0, 97)}…` : this.errorMessage;
      this.toast.error(short);
    } finally {
      this.isSendingOtp = false;
    }
  }

  async verifyEmailCode(): Promise<void> {
    if (this.isVerifyingOtp) return;
    this.errorMessage = '';
    this.isVerifyingOtp = true;
    try {
      const res = await this.api.verifyEmailOtp(this.email.trim(), this.otp.trim());
      this.emailTicket = res.emailTicket;
      this.toast.success('Email verified. Connect your wallet.');
      this.loginStep = 3;
    } catch (err) {
      this.errorMessage = this.getDisplayError(err);
      const short =
        this.errorMessage.length > 100 ? `${this.errorMessage.slice(0, 97)}…` : this.errorMessage;
      this.toast.error(short);
    } finally {
      this.isVerifyingOtp = false;
    }
  }

  async connectWallet() {
    if (this.isConnecting) return;
    if (!this.web3.hasEthereumProvider()) {
      this.hasWalletProvider = false;
      void this.router.navigate(['/wallet-setup']);
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
      this.lastWalletAttempted = address;

      if (!this.emailTicket) {
        let status: { verified: boolean; linked: boolean; accountBlocked: boolean; email: string | null };
        try {
          status = await this.api.getEmailStatus(address);
        } catch {
          throw new Error('Could not verify wallet email status. Restart the backend after migrations and try again.');
        }
        if (status.accountBlocked) {
          void this.router.navigate(['/account-blocked'], {
            queryParams: { wallet: address, ...(status.email ? { email: status.email } : {}) },
          });
          return;
        }
        if (!status.verified) {
          this.errorMessage =
            'This wallet is not linked to a verified email yet. Verify your email code first for initial setup.';
          this.loginStep = 1;
          return;
        }
      }

      const message = await this.api.getNonce(address, this.emailTicket || undefined);

      const signature = await this.web3.signMessage(address, message);

      const response = await this.api.login(address, signature, message, this.emailTicket || undefined);

      this.auth.loginWithWallet(response.address, response.role, response.token);
      this.toast.success('Signed in successfully.');
      void this.router.navigate(['/profile']);
    } catch (err) {
      if (this.isAccountBlockedError(err)) {
        const fallbackAddress = this.lastWalletAttempted || this.auth.getUser()?.address;
        void this.router.navigate(['/account-blocked'], {
          queryParams: {
            ...(fallbackAddress ? { wallet: fallbackAddress } : {}),
            ...(this.email.trim() ? { email: this.email.trim() } : {}),
          },
        });
        return;
      }
      this.errorMessage = this.getDisplayError(err);
      const short =
        this.errorMessage.length > 100 ? `${this.errorMessage.slice(0, 97)}…` : this.errorMessage;
      this.toast.error(short);
      console.error('Authentication error:', err);
    } finally {
      this.isConnecting = false;
    }
  }

  continueWithWalletOnly(): void {
    this.errorMessage = '';
    this.emailTicket = '';
    this.loginStep = 3;
  }
}

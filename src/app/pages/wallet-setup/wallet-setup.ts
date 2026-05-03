import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Web3Service } from '../../services/web3';

@Component({
  selector: 'app-wallet-setup',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './wallet-setup.html',
  styleUrl: './wallet-setup.scss',
})
export class WalletSetup {
  isChecking = false;
  statusMessage = '';
  isSuccess = false;

  constructor(
    private router: Router,
    private web3: Web3Service,
  ) {}

  async verifySetup(): Promise<void> {
    if (this.isChecking) return;

    this.isChecking = true;
    this.statusMessage = '';
    this.isSuccess = false;

    try {
      const detected = this.web3.hasEthereumProvider();
      if (!detected) {
        this.statusMessage =
          'MetaMask is still not detected. Complete installation and refresh this page.';
        return;
      }

      this.isSuccess = true;
      this.statusMessage = 'MetaMask detected. You can continue to secure sign-in.';
      await this.router.navigate(['/login']);
    } finally {
      this.isChecking = false;
    }
  }
}

import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

@Injectable({ providedIn: 'root' })
export class Web3Service {
  private platformId = inject(PLATFORM_ID);

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  hasEthereumProvider(): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    return Boolean((window as Window & { ethereum?: EthereumProvider }).ethereum);
  }

  private getEthereum(): EthereumProvider {
    const ethereum = (window as Window & { ethereum?: EthereumProvider }).ethereum;
    if (!ethereum) {
      throw new Error('Ethereum provider not found');
    }

    return ethereum;
  }

  async connectWalletOnly(): Promise<string[]> {
    const accounts = await this.getEthereum().request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts) || !accounts.every((item) => typeof item === 'string')) {
      throw new Error('Invalid wallet accounts response');
    }

    return accounts;
  }

  async signMessage(address: string, message: string): Promise<string> {
    const signature = await this.getEthereum().request({
      method: 'personal_sign',
      params: [message, address],
    });

    if (typeof signature !== 'string') {
      throw new Error('Invalid signature response');
    }

    return signature;
  }
}

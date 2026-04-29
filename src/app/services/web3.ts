import { Injectable } from '@angular/core';

declare let window: any;

@Injectable({ providedIn: 'root' })
export class Web3Service {
  async connectWalletOnly() {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    return accounts;
  }

  async signMessage(address: string, message: string) {
    return await window.ethereum.request({
      method: 'personal_sign',
      params: [message, address],
    });
  }
}

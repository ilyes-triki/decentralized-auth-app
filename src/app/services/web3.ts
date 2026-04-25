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

  async connectAndSign() {
    try {
      if (!window.ethereum) {
        alert('MetaMask not detected');
        return null;
      }

      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];

      const message = 'Login to my app';

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, address],
      });

      return { address, signature, message };
    } catch (error: any) {
      console.error(error);
      return null;
    }
  }
}

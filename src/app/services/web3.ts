import { Injectable } from '@angular/core';
import { ethers } from 'ethers';

declare let window: any;

@Injectable({
  providedIn: 'root',
})
export class Web3Service {
  async connectAndSign(): Promise<{ address: string; signature: string } | null> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        alert('MetaMask not detected');
        return null;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      await provider.send('eth_requestAccounts', []);

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const message = 'Login to decentralized authentication system';

      const signature = await signer.signMessage(message);

      return { address, signature };
    } catch (error) {
      console.error('Signing failed', error);
      return null;
    }
  }
}

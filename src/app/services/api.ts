import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  baseUrl = 'http://localhost:8080/api/auth';

  async getNonce(address: string) {
    const res = await fetch(`${this.baseUrl}/nonce?address=${address}`);
    return res.text();
  }

  async login(address: string, signature: string, message: string) {
    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        signature,
        message,
      }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    return res.json();
  }
}

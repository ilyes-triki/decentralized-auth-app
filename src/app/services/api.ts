import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  baseUrl = 'http://localhost:8080/api/auth';

  async testBackend() {
    const res = await fetch(`${this.baseUrl}/test`);
    return res.text();
  }
}

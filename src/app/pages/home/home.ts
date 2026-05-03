import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  constructor(public auth: AuthService) {}

  shortAddress(addr: string): string {
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }
}

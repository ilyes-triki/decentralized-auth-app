import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';
import { ToastHost } from './shared/toast-host/toast-host';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, ToastHost],
  template: `
    <div class="app-shell">
      <app-navbar />
      <main class="app-main">
        <router-outlet />
      </main>
      <app-toast-host />
    </div>
  `,
})
export class App {}

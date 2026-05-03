import { Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  template: `
    @if (toast.state(); as t) {
      <div class="toast-host" role="status" aria-live="polite">
        <div
          class="toast-card"
          [class.toast-card--error]="t.kind === 'error'"
          [class.toast-card--info]="t.kind === 'info'"
        >
          {{ t.text }}
        </div>
      </div>
    }
  `,
  styleUrl: './toast-host.scss',
})
export class ToastHost {
  readonly toast = inject(ToastService);
}

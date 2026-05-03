import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastPayload = { text: string; kind: ToastKind };

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  /** Current toast (null = hidden). */
  readonly state = signal<ToastPayload | null>(null);
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  clear(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.state.set(null);
  }

  /** Default success toast (backward compatible name). */
  show(text: string, durationMs = 3600): void {
    this.present(text, 'success', durationMs);
  }

  success(text: string, durationMs = 3600): void {
    this.present(text, 'success', durationMs);
  }

  error(text: string, durationMs = 5200): void {
    this.present(text, 'error', durationMs);
  }

  info(text: string, durationMs = 4000): void {
    this.present(text, 'info', durationMs);
  }

  private present(text: string, kind: ToastKind, durationMs: number): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.state.set({ text, kind });
    this.hideTimer = setTimeout(() => {
      this.state.set(null);
      this.hideTimer = null;
    }, durationMs);
  }
}

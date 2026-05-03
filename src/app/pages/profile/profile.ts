import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { AuthUser } from '../../models/auth.models';
import { ApiService } from '../../services/api';
import { toUserMessage } from '../../services/error-handler';
import { ToastService } from '../../services/toast.service';
import { ErrorBanner } from '../../shared/error-banner/error-banner';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ErrorBanner],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  isVerifying = false;
  serverAddress = '';
  verifyError = '';

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    void this.verifyServerSession();
  }

  get user(): AuthUser | null {
    return this.auth.getUser();
  }

  private patchUi(update: () => void): void {
    this.zone.run(() => {
      update();
      this.cdr.detectChanges();
    });
  }

  async verifyServerSession(): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.patchUi(() => {
        this.verifyError = 'No token found. Please sign in again.';
      });
      return;
    }

    this.patchUi(() => {
      this.isVerifying = true;
      this.verifyError = '';
    });

    try {
      const me = await this.api.getMe();
      this.patchUi(() => {
        this.serverAddress = me.address;
      });
      this.toast.success('Profile verified with the server.');
    } catch (error) {
      this.patchUi(() => {
        this.verifyError = toUserMessage(error, 'Failed to verify with server. Please sign in again.');
      });
      const msg = toUserMessage(error, 'Verification failed.');
      this.toast.error(msg.length > 100 ? `${msg.slice(0, 97)}…` : msg);
    } finally {
      this.patchUi(() => {
        this.isVerifying = false;
      });
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}

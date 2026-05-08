import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast.service';
import { toUserMessage } from '../../services/error-handler';
import { ErrorBanner } from '../../shared/error-banner/error-banner';

@Component({
  selector: 'app-account-blocked',
  standalone: true,
  imports: [FormsModule, RouterLink, ErrorBanner],
  templateUrl: './account-blocked.html',
  styleUrl: './account-blocked.scss',
})
export class AccountBlocked implements OnInit {
  walletAddress = '';
  email = '';
  justification = '';
  evidenceUrl = '';
  errorMessage = '';
  successMessage = '';
  hasOpenAppeal = false;
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.walletAddress = params.get('wallet') ?? this.walletAddress;
      this.email = params.get('email') ?? this.email;
    });
  }

  async submitAppeal(): Promise<void> {
    if (this.isSubmitting) return;
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.walletAddress.trim()) {
      this.errorMessage = 'Wallet address is required.';
      this.toast.error(this.errorMessage);
      return;
    }
    if (this.hasOpenAppeal) {
      this.errorMessage = 'You already have an open appeal. Please wait for admin review.';
      this.toast.error(this.errorMessage);
      return;
    }
    if (this.justification.trim().length < 10) {
      this.errorMessage = 'Please provide a full justification (minimum 10 characters).';
      this.toast.error(this.errorMessage);
      return;
    }
    this.isSubmitting = true;
    try {
      const result = await this.api.submitAccountBlockAppeal({
        walletAddress: this.walletAddress.trim(),
        email: this.email.trim() || undefined,
        justification: this.justification.trim(),
        evidenceUrl: this.evidenceUrl.trim() || undefined,
      });
      this.successMessage = `Appeal submitted successfully (ID #${result.appealId}). Admin will review it soon.`;
      this.hasOpenAppeal = true;
      this.toast.success(`Appeal #${result.appealId} submitted.`);
      this.justification = '';
      this.evidenceUrl = '';
    } catch (e) {
      this.errorMessage = toUserMessage(e, 'Failed to submit account appeal.');
      if (this.errorMessage.toLowerCase().includes('open appeal')) {
        this.hasOpenAppeal = true;
        this.successMessage = 'An appeal is already open for this wallet. Wait for admin approval/rejection.';
      }
      this.toast.error(this.errorMessage);
    } finally {
      this.isSubmitting = false;
    }
  }
}

import { ChangeDetectorRef, Component, DestroyRef, NgZone, OnInit, inject } from '@angular/core';
import { EmptyError, Observable, Subject } from 'rxjs';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { toUserMessage } from '../../services/error-handler';
import { ToastService } from '../../services/toast.service';
import { ErrorBanner } from '../../shared/error-banner/error-banner';

type AdminChartDay = {
  day: string;
  success: number;
  fail: number;
  total: number;
  successPct: number;
  failPct: number;
};

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ErrorBanner],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  /** Relative window for stats + history; sent as ISO `since` to the API (UTC). */
  timeWindow: 'all' | '7d' | '30d' = 'all';

  isChecking = false;
  status = '';
  scope = '';
  errorMessage = '';
  isLoadingHistory = false;
  historyError = '';
  isLoadingStats = false;
  statsError = '';
  loginStats: { totalAttempts: number; successfulAttempts: number; failedAttempts: number } | null = null;
  loginHistory: {
    id: number;
    address: string;
    successful: boolean;
    failureReason: string | null;
    createdAt: string;
  }[] = [];
  /** Aggregated from the current (latest 50) history sample for a simple bar chart. */
  chartDays: AdminChartDay[] = [];
  accessLogRows: {
    id: number;
    createdAt: string;
    requestId: string;
    httpMethod: string;
    path: string;
    statusCode: number;
    durationMs: number;
    principal: string | null;
  }[] = [];
  isLoadingAccessLog = false;
  accessLogError = '';

  private destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  /** Emits to cancel in-flight admin HTTP calls (new load or destroy). */
  private cancelAdmin$ = new Subject<void>();
  private historyLoadId = 0;
  private statsLoadId = 0;
  private accessLogLoadId = 0;
  /** First admin load must not emit on cancel stream before subscriptions exist (avoids EmptyError / stuck UI). */
  private adminInitialLoad = true;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private toast: ToastService,
  ) {
    this.destroyRef.onDestroy(() => {
      this.cancelAdmin$.next();
      this.cancelAdmin$.complete();
    });
  }

  ngOnInit(): void {
    void this.checkAdminAccess();
  }

  /** Next admin data load cancels any in-flight admin API requests. */
  private beginAdminDataLoad(): void {
    this.cancelAdmin$.next();
  }

  private adminCancelStream() {
    return this.cancelAdmin$.asObservable();
  }

  private isCancelledError(e: unknown): boolean {
    return e instanceof EmptyError;
  }

  /** HttpClient + async/await can finish outside NgZone; force updates so "Checking…" clears. */
  private patchUi(update: () => void): void {
    this.zone.run(() => {
      update();
      this.cdr.detectChanges();
    });
  }

  private recomputeDailyChart(): void {
    const map = new Map<string, { success: number; fail: number }>();
    for (const row of this.loginHistory) {
      const key = row.createdAt.length >= 10 ? row.createdAt.slice(0, 10) : row.createdAt;
      const cur = map.get(key) ?? { success: 0, fail: 0 };
      if (row.successful) {
        cur.success += 1;
      } else {
        cur.fail += 1;
      }
      map.set(key, cur);
    }
    this.chartDays = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => {
        const total = v.success + v.fail;
        return {
          day,
          success: v.success,
          fail: v.fail,
          total,
          successPct: total ? (v.success / total) * 100 : 0,
          failPct: total ? (v.fail / total) * 100 : 0,
        };
      });
  }

  async checkAdminAccess(): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.errorMessage = 'No token found. Please sign in again.';
      return;
    }

    this.isChecking = true;
    this.errorMessage = '';
    this.status = '';
    this.scope = '';
    this.historyError = '';
    this.statsError = '';
    this.loginHistory = [];
    this.loginStats = null;
    this.chartDays = [];
    this.accessLogRows = [];
    this.accessLogError = '';

    if (!this.adminInitialLoad) {
      this.beginAdminDataLoad();
    }
    this.adminInitialLoad = false;
    const cancel$ = this.adminCancelStream();

    try {
      const health = await this.api.getAdminHealth(cancel$);
      this.patchUi(() => {
        this.status = health.status;
        this.scope = health.scope;
      });
      const sinceSnapshot = this.sinceParam();
      await Promise.all([
        this.loadLoginHistory(cancel$, sinceSnapshot),
        this.loadLoginStats(cancel$, sinceSnapshot),
        this.loadAccessLog(cancel$),
      ]);
      this.patchUi(() => {
        this.errorMessage = '';
      });
    } catch (error) {
      if (this.isCancelledError(error)) {
        this.patchUi(() => {
          this.isChecking = false;
        });
        return;
      }
      this.patchUi(() => {
        this.errorMessage = toUserMessage(error, 'Admin verification failed. You may not have access.');
      });
    } finally {
      this.patchUi(() => {
        this.isChecking = false;
      });
    }
  }

  sinceParam(): string | undefined {
    if (this.timeWindow === 'all') {
      return undefined;
    }
    const days = this.timeWindow === '7d' ? 7 : 30;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString();
  }

  onTimeWindowChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const v = el.value;
    if (v === 'all' || v === '7d' || v === '30d') {
      this.timeWindow = v;
      void this.refreshDashboardData();
    }
  }

  async loadLoginHistory(cancel$?: Observable<unknown>, since?: string): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.historyError = 'No token found. Please sign in again.';
      return;
    }

    const id = ++this.historyLoadId;
    this.isLoadingHistory = true;
    this.historyError = '';

    try {
      const rows = await this.api.getLoginHistory(since ?? this.sinceParam(), cancel$);
      this.patchUi(() => {
        this.loginHistory = rows;
        this.recomputeDailyChart();
      });
    } catch (error) {
      if (this.isCancelledError(error)) {
        throw error;
      }
      this.patchUi(() => {
        this.historyError = toUserMessage(error, 'Failed to load login history.');
      });
    } finally {
      this.patchUi(() => {
        if (id === this.historyLoadId) {
          this.isLoadingHistory = false;
        }
      });
    }
  }

  async loadLoginStats(cancel$?: Observable<unknown>, since?: string): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.statsError = 'No token found. Please sign in again.';
      return;
    }

    const id = ++this.statsLoadId;
    this.isLoadingStats = true;
    this.statsError = '';

    try {
      const stats = await this.api.getAdminLoginStats(since ?? this.sinceParam(), cancel$);
      this.patchUi(() => {
        this.loginStats = stats;
      });
    } catch (error) {
      if (this.isCancelledError(error)) {
        throw error;
      }
      this.patchUi(() => {
        this.statsError = toUserMessage(error, 'Failed to load login stats.');
      });
    } finally {
      this.patchUi(() => {
        if (id === this.statsLoadId) {
          this.isLoadingStats = false;
        }
      });
    }
  }

  async loadAccessLog(cancel$?: Observable<unknown>): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.accessLogError = 'No token found. Please sign in again.';
      return;
    }

    const id = ++this.accessLogLoadId;
    this.isLoadingAccessLog = true;
    this.accessLogError = '';

    try {
      const rows = await this.api.getAdminAccessLog(cancel$);
      this.patchUi(() => {
        this.accessLogRows = rows;
      });
    } catch (error) {
      if (this.isCancelledError(error)) {
        throw error;
      }
      this.patchUi(() => {
        this.accessLogError = toUserMessage(error, 'Failed to load HTTP access log.');
      });
      this.toast.error('Could not load API access log.');
    } finally {
      this.patchUi(() => {
        if (id === this.accessLogLoadId) {
          this.isLoadingAccessLog = false;
        }
      });
    }
  }

  async refreshDashboardData(options?: { toastOnSuccess?: boolean }): Promise<void> {
    this.beginAdminDataLoad();
    const cancel$ = this.adminCancelStream();
    const toastOnSuccess = options?.toastOnSuccess === true;
    try {
      const sinceSnapshot = this.sinceParam();
      await Promise.all([
        this.loadLoginHistory(cancel$, sinceSnapshot),
        this.loadLoginStats(cancel$, sinceSnapshot),
        this.loadAccessLog(cancel$),
      ]);
      if (toastOnSuccess) {
        this.toast.show('Dashboard refreshed');
      }
    } catch (error) {
      if (this.isCancelledError(error)) {
        return;
      }
      throw error;
    }
  }
}

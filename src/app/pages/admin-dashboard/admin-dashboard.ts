import { ChangeDetectorRef, Component, DestroyRef, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  imports: [ErrorBanner, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard implements OnInit {
  currentSection: 'overview' | 'ip-security' | 'access-log' | 'appeals' = 'overview';
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
    clientIp?: string | null;
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

  ipEventRisk: '' | 'LOW' | 'MEDIUM' | 'HIGH' = '';
  ipEvents: {
    id: number;
    ip: string;
    riskLevel: string;
    reason: string;
    path: string;
    httpMethod: string;
    requestId: string;
    createdAt: string;
    details: string | null;
  }[] = [];
  ipBlocks: {
    ip: string;
    source: string;
    reason: string;
    blockedUntil: string | null;
    createdAt: string;
    createdBy: string | null;
  }[] = [];
  isLoadingIpEvents = false;
  isLoadingIpBlocks = false;
  ipEventsError = '';
  ipBlocksError = '';
  blockIpInput = '';
  blockReasonInput = '';
  blockPermanent = false;
  isBlockingIp = false;
  appealStatusFilter: '' | 'OPEN' | 'APPROVED' | 'REJECTED' = '';
  appeals: {
    id: number;
    walletAddress: string;
    email: string | null;
    justification: string;
    evidenceUrl: string | null;
    status: string;
    adminNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
    resolvedBy: string | null;
  }[] = [];
  isLoadingAppeals = false;
  appealsError = '';
  resolvingAppealId: number | null = null;
  private ipEventsLoadId = 0;
  private ipBlocksLoadId = 0;
  private appealsLoadId = 0;

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
    private route: ActivatedRoute,
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
    this.route.paramMap.subscribe((params) => {
      const section = params.get('section');
      this.currentSection = this.normalizeSection(section);
      if (this.status) {
        void this.refreshDashboardData();
      }
    });
    void this.checkAdminAccess();
  }

  private normalizeSection(section: string | null): 'overview' | 'ip-security' | 'access-log' | 'appeals' {
    if (section === 'ip-security' || section === 'access-log' || section === 'appeals') {
      return section;
    }
    return 'overview';
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
    this.ipEvents = [];
    this.ipBlocks = [];
    this.ipEventsError = '';
    this.ipBlocksError = '';
    this.appeals = [];
    this.appealsError = '';

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
      await this.loadCurrentSection(cancel$, sinceSnapshot);
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

  async loadIpEvents(cancel$?: Observable<unknown>): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.ipEventsError = 'No token found. Please sign in again.';
      return;
    }
    const id = ++this.ipEventsLoadId;
    this.isLoadingIpEvents = true;
    this.ipEventsError = '';
    const risk = this.ipEventRisk || undefined;
    try {
      const rows = await this.api.getAdminIpEvents(risk, cancel$);
      this.patchUi(() => {
        this.ipEvents = rows;
      });
    } catch (error) {
      if (this.isCancelledError(error)) {
        throw error;
      }
      this.patchUi(() => {
        this.ipEventsError = toUserMessage(error, 'Failed to load IP risk events.');
      });
    } finally {
      this.patchUi(() => {
        if (id === this.ipEventsLoadId) {
          this.isLoadingIpEvents = false;
        }
      });
    }
  }

  async loadIpBlocks(cancel$?: Observable<unknown>): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.ipBlocksError = 'No token found. Please sign in again.';
      return;
    }
    const id = ++this.ipBlocksLoadId;
    this.isLoadingIpBlocks = true;
    this.ipBlocksError = '';
    try {
      const rows = await this.api.getAdminIpBlocks(cancel$);
      this.patchUi(() => {
        this.ipBlocks = rows;
      });
    } catch (error) {
      if (this.isCancelledError(error)) {
        throw error;
      }
      this.patchUi(() => {
        this.ipBlocksError = toUserMessage(error, 'Failed to load IP block list.');
      });
    } finally {
      this.patchUi(() => {
        if (id === this.ipBlocksLoadId) {
          this.isLoadingIpBlocks = false;
        }
      });
    }
  }

  onIpRiskFilterChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const v = el.value;
    if (v === '' || v === 'LOW' || v === 'MEDIUM' || v === 'HIGH') {
      this.ipEventRisk = v;
      void this.loadIpEvents(this.adminCancelStream());
    }
  }

  async submitManualBlock(): Promise<void> {
    const ip = this.blockIpInput.trim();
    if (!ip) {
      this.toast.error('Enter an IP address to block.');
      return;
    }
    this.isBlockingIp = true;
    try {
      await this.api.adminBlockIp(ip, this.blockReasonInput.trim() || 'Manual block', this.blockPermanent);
      this.toast.success(`Blocked ${ip}`);
      this.blockIpInput = '';
      this.blockReasonInput = '';
      this.blockPermanent = false;
      await this.loadIpBlocks();
      await this.loadIpEvents();
    } catch (e) {
      this.toast.error(toUserMessage(e, 'Failed to block IP.'));
    } finally {
      this.isBlockingIp = false;
    }
  }

  async unblockListedIp(ip: string): Promise<void> {
    try {
      await this.api.adminUnblockIp(ip);
      this.toast.success(`Unblocked ${ip}`);
      await this.loadIpBlocks();
    } catch (e) {
      this.toast.error(toUserMessage(e, 'Failed to unblock IP.'));
    }
  }

  async loadAppeals(cancel$?: Observable<unknown>): Promise<void> {
    const token = this.auth.getToken();
    if (!token) {
      this.appealsError = 'No token found. Please sign in again.';
      return;
    }
    const id = ++this.appealsLoadId;
    this.isLoadingAppeals = true;
    this.appealsError = '';
    try {
      const rows = await this.api.getAdminAccountAppeals(this.appealStatusFilter || undefined, cancel$);
      this.patchUi(() => {
        this.appeals = rows;
      });
    } catch (error) {
      if (this.isCancelledError(error)) throw error;
      this.patchUi(() => {
        this.appealsError = toUserMessage(error, 'Failed to load account appeals.');
      });
    } finally {
      this.patchUi(() => {
        if (id === this.appealsLoadId) this.isLoadingAppeals = false;
      });
    }
  }

  onAppealFilterChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const v = el.value;
    if (v === '' || v === 'OPEN' || v === 'APPROVED' || v === 'REJECTED') {
      this.appealStatusFilter = v;
      void this.loadAppeals(this.adminCancelStream());
    }
  }

  async resolveAppeal(id: number, approve: boolean): Promise<void> {
    const note = window.prompt(approve ? 'Approval note (optional):' : 'Rejection reason (optional):') ?? '';
    this.resolvingAppealId = id;
    try {
      const res = await this.api.resolveAdminAccountAppeal(id, approve, note);
      this.toast.success(`Appeal #${res.id} resolved (${res.status}).`);
      await this.loadAppeals();
      await this.loadIpBlocks();
    } catch (e) {
      this.toast.error(toUserMessage(e, 'Failed to resolve appeal.'));
    } finally {
      this.resolvingAppealId = null;
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
      await this.loadCurrentSection(cancel$, sinceSnapshot);
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

  private async loadCurrentSection(cancel$?: Observable<unknown>, since?: string): Promise<void> {
    if (this.currentSection === 'overview') {
      await Promise.all([this.loadLoginHistory(cancel$, since), this.loadLoginStats(cancel$, since)]);
      return;
    }
    if (this.currentSection === 'ip-security') {
      await Promise.all([this.loadIpEvents(cancel$), this.loadIpBlocks(cancel$)]);
      return;
    }
    if (this.currentSection === 'appeals') {
      await this.loadAppeals(cancel$);
      return;
    }
    await this.loadAccessLog(cancel$);
  }
}

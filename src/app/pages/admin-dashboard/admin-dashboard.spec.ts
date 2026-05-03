import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast.service';

import { AdminDashboard } from './admin-dashboard';

describe('AdminDashboard', () => {
  let component: AdminDashboard;
  let fixture: ComponentFixture<AdminDashboard>;
  let toast: ToastService;
  let authMock: { getToken: () => string | null };
  let apiMock: {
    getAdminHealth: (cancel$?: Observable<unknown>) => Promise<{ status: string; scope: string }>;
    getAdminLoginStats: (since?: string, cancel$?: Observable<unknown>) => Promise<{
      totalAttempts: number;
      successfulAttempts: number;
      failedAttempts: number;
    }>;
    getLoginHistory: (since?: string, cancel$?: Observable<unknown>) => Promise<
      { id: number; address: string; successful: boolean; failureReason: string | null; createdAt: string }[]
    >;
    getAdminAccessLog: (cancel$?: Observable<unknown>) => Promise<
      {
        id: number;
        createdAt: string;
        requestId: string;
        httpMethod: string;
        path: string;
        statusCode: number;
        durationMs: number;
        principal: string | null;
      }[]
    >;
  };

  beforeEach(async () => {
    authMock = {
      getToken: () => 'jwt',
    };
    apiMock = {
      getAdminHealth: async () => ({ status: 'ok', scope: 'admin' }),
      getAdminLoginStats: async () => ({
        totalAttempts: 5,
        successfulAttempts: 4,
        failedAttempts: 1,
      }),
      getLoginHistory: async () => [
        { id: 1, address: '0xabc', successful: true, failureReason: null, createdAt: 'now' },
      ],
      getAdminAccessLog: async () => [
        {
          id: 1,
          createdAt: '2026-01-01T00:00:00Z',
          requestId: 'rid-1',
          httpMethod: 'GET',
          path: '/api/profile/me',
          statusCode: 200,
          durationMs: 12,
          principal: '0xabc',
        },
      ],
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboard],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: ApiService, useValue: apiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboard);
    component = fixture.componentInstance;
    toast = TestBed.inject(ToastService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set status and scope when health call succeeds', async () => {
    await component.checkAdminAccess();

    expect(component.status).toBe('ok');
    expect(component.scope).toBe('admin');
    expect(component.errorMessage).toBe('');
    expect(component.loginHistory.length).toBe(1);
    expect(component.loginStats?.totalAttempts).toBe(5);
    expect(component.loginStats?.successfulAttempts).toBe(4);
    expect(component.loginStats?.failedAttempts).toBe(1);
    expect(component.chartDays.length).toBeGreaterThan(0);
    expect(component.accessLogRows.length).toBe(1);
    expect(component.accessLogRows[0].path).toContain('/api/profile/me');
  });

  it('should toast after refresh when toastOnSuccess is enabled', async () => {
    toast.clear();

    await component.refreshDashboardData({ toastOnSuccess: true });

    expect(toast.state()?.text).toContain('Dashboard refreshed');
  });

  it('should set error when no token exists', async () => {
    authMock.getToken = () => null;

    await component.checkAdminAccess();

    expect(component.errorMessage).toContain('No token');
  });

  it('should pass since to API when time window is not all', async () => {
    let statsSince: string | undefined;
    let historySince: string | undefined;
    apiMock.getAdminLoginStats = async (since?: string) => {
      statsSince = since;
      return { totalAttempts: 1, successfulAttempts: 1, failedAttempts: 0 };
    };
    apiMock.getLoginHistory = async (since?: string) => {
      historySince = since;
      return [];
    };

    component.timeWindow = '7d';
    await component.refreshDashboardData();

    expect(typeof statsSince).toBe('string');
    expect(typeof historySince).toBe('string');
    expect(statsSince).toBe(historySince);
  });
});

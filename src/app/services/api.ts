import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { EmptyError, Observable, TimeoutError, firstValueFrom } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import { LoginResponse } from '../models/auth.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  baseUrl = environment.apiBaseUrl;
  /** Avoid indefinite hangs when the backend is down or unreachable (browser has no default HTTP timeout). */
  private readonly requestTimeoutMs = 15000;

  private get apiRoot(): string {
    return this.baseUrl.endsWith('/api/auth') ? this.baseUrl.slice(0, -'/auth'.length) : this.baseUrl;
  }

  private apiOriginHint(): string {
    try {
      return new URL(this.baseUrl).origin;
    } catch {
      return this.baseUrl;
    }
  }

  private messageFromHttp(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return `Cannot reach the API at ${this.apiOriginHint()}. Start the Spring Boot backend (port 8080) or check the URL in src/environments/environment.ts.`;
      }
      const body = err.error;
      if (body && typeof body === 'object') {
        const record = body as Record<string, unknown>;
        if (typeof record['message'] === 'string' && record['message'].trim().length > 0) {
          let msg = record['message'].trim();
          const code = typeof record['errorCode'] === 'string' ? (record['errorCode'] as string).trim() : '';
          const rid = typeof record['requestId'] === 'string' ? (record['requestId'] as string).trim() : '';
          if (code || rid) {
            const bits: string[] = [];
            if (code) {
              bits.push(`code ${code}`);
            }
            if (rid) {
              bits.push(`ref ${rid}`);
            }
            msg = `${msg} (${bits.join(', ')})`;
          }
          return msg;
        }
      }
      return fallback;
    }
    if (err instanceof Error && err.message.trim().length > 0) {
      return err.message;
    }
    return fallback;
  }

  /** Network timeout + optional cancellation (admin dashboard). */
  private bounded<T>(source: Observable<T>, cancel$?: Observable<unknown>): Observable<T> {
    let piped = source.pipe(timeout({ first: this.requestTimeoutMs }));
    if (cancel$) {
      piped = piped.pipe(takeUntil(cancel$));
    }
    return piped;
  }

  private async unwrap<T>(promise: Promise<T>, fallback: string): Promise<T> {
    try {
      return await promise;
    } catch (e) {
      if (e instanceof EmptyError) {
        throw e;
      }
      if (e instanceof TimeoutError) {
        throw new Error(
          `Request timed out after ${this.requestTimeoutMs / 1000}s. Is the backend running at ${this.apiOriginHint()}?`,
        );
      }
      throw new Error(this.messageFromHttp(e, fallback));
    }
  }

  async startEmailOtp(email: string): Promise<{ message: string }> {
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(this.http.post<unknown>(`${this.baseUrl}/email/start`, { email })),
      ),
      'Failed to start email verification',
    );
    if (!payload || typeof payload !== 'object' || typeof (payload as Record<string, unknown>)['message'] !== 'string') {
      throw new Error('Invalid email start response');
    }
    return { message: (payload as Record<string, unknown>)['message'] as string };
  }

  async verifyEmailOtp(email: string, otp: string): Promise<{ emailTicket: string; expiresInSeconds: number }> {
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(this.http.post<unknown>(`${this.baseUrl}/email/verify`, { email, otp })),
      ),
      'Failed to verify email code',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid email verify response');
    }
    const rec = payload as Record<string, unknown>;
    if (typeof rec['emailTicket'] !== 'string' || typeof rec['expiresInSeconds'] !== 'number') {
      throw new Error('Invalid email verify response');
    }
    return { emailTicket: rec['emailTicket'], expiresInSeconds: rec['expiresInSeconds'] };
  }

  async getEmailStatus(
    address: string,
  ): Promise<{ verified: boolean; linked: boolean; accountBlocked: boolean; email: string | null }> {
    const params = new HttpParams().set('address', address);
    const payload = await this.unwrap(
      firstValueFrom(this.bounded(this.http.get<unknown>(`${this.baseUrl}/email-status`, { params }))),
      'Failed to check email status for wallet',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid email status response');
    }
    const rec = payload as Record<string, unknown>;
    if (
      typeof rec['verified'] !== 'boolean' ||
      typeof rec['linked'] !== 'boolean' ||
      typeof rec['accountBlocked'] !== 'boolean' ||
      (rec['email'] !== null && rec['email'] !== undefined && typeof rec['email'] !== 'string')
    ) {
      throw new Error('Invalid email status response');
    }
    return {
      verified: rec['verified'],
      linked: rec['linked'],
      accountBlocked: rec['accountBlocked'],
      email: (rec['email'] ?? null) as string | null,
    };
  }

  async submitAccountBlockAppeal(payload: {
    walletAddress: string;
    email?: string;
    justification: string;
    evidenceUrl?: string;
  }): Promise<{ status: string; appealId: number; walletAddress: string }> {
    const body: Record<string, unknown> = {
      walletAddress: payload.walletAddress,
      justification: payload.justification,
    };
    if (payload.email && payload.email.trim().length > 0) body['email'] = payload.email.trim();
    if (payload.evidenceUrl && payload.evidenceUrl.trim().length > 0) body['evidenceUrl'] = payload.evidenceUrl.trim();
    const response = await this.unwrap(
      firstValueFrom(this.bounded(this.http.post<unknown>(`${this.baseUrl}/block-appeals`, body))),
      'Failed to submit appeal',
    );
    if (!response || typeof response !== 'object') throw new Error('Invalid appeal response');
    const rec = response as Record<string, unknown>;
    if (typeof rec['status'] !== 'string' || typeof rec['appealId'] !== 'number' || typeof rec['walletAddress'] !== 'string') {
      throw new Error('Invalid appeal response');
    }
    return { status: rec['status'], appealId: rec['appealId'], walletAddress: rec['walletAddress'] };
  }

  async getAdminAccountAppeals(
    status?: 'OPEN' | 'APPROVED' | 'REJECTED',
    cancel$?: Observable<unknown>,
  ): Promise<
    {
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
    }[]
  > {
    const params = status ? new HttpParams().set('status', status) : undefined;
    const response = await this.unwrap(
      firstValueFrom(
        this.bounded(this.http.get<unknown[]>(`${this.apiRoot}/admin/account-appeals`, params ? { params } : {}), cancel$),
      ),
      'Failed to load account appeals',
    );
    if (!Array.isArray(response)) throw new Error('Invalid appeals response');
    return response.map((item) => {
      if (!item || typeof item !== 'object') throw new Error('Invalid appeals response');
      const r = item as Record<string, unknown>;
      if (
        typeof r['id'] !== 'number' ||
        typeof r['walletAddress'] !== 'string' ||
        typeof r['justification'] !== 'string' ||
        typeof r['status'] !== 'string' ||
        typeof r['createdAt'] !== 'string'
      ) {
        throw new Error('Invalid appeals response');
      }
      return {
        id: r['id'],
        walletAddress: r['walletAddress'],
        email: (r['email'] ?? null) as string | null,
        justification: r['justification'],
        evidenceUrl: (r['evidenceUrl'] ?? null) as string | null,
        status: r['status'],
        adminNote: (r['adminNote'] ?? null) as string | null,
        createdAt: r['createdAt'],
        resolvedAt: (r['resolvedAt'] ?? null) as string | null,
        resolvedBy: (r['resolvedBy'] ?? null) as string | null,
      };
    });
  }

  async resolveAdminAccountAppeal(
    id: number,
    approve: boolean,
    adminNote: string,
    cancel$?: Observable<unknown>,
  ): Promise<{ id: number; status: string; walletAddress: string }> {
    const response = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.post<unknown>(`${this.apiRoot}/admin/account-appeals/${id}/resolve`, { approve, adminNote }),
          cancel$,
        ),
      ),
      'Failed to resolve account appeal',
    );
    if (!response || typeof response !== 'object') throw new Error('Invalid appeal resolution response');
    const r = response as Record<string, unknown>;
    if (typeof r['id'] !== 'number' || typeof r['status'] !== 'string' || typeof r['walletAddress'] !== 'string') {
      throw new Error('Invalid appeal resolution response');
    }
    return { id: r['id'], status: r['status'], walletAddress: r['walletAddress'] };
  }

  async getNonce(address: string, emailTicket?: string): Promise<string> {
    let params = new HttpParams().set('address', address);
    if (emailTicket && emailTicket.trim().length > 0) {
      params = params.set('emailTicket', emailTicket.trim());
    }
    return this.unwrap(
      firstValueFrom(
        this.bounded(this.http.get(`${this.baseUrl}/nonce`, { params, responseType: 'text' })),
      ),
      'Failed to fetch nonce',
    );
  }

  private isLoginResponse(value: unknown): value is LoginResponse {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const payload = value as Record<string, unknown>;
    const role = payload['role'];
    return (
      typeof payload['address'] === 'string' &&
      (role === 'admin' || role === 'user') &&
      (payload['token'] === undefined || typeof payload['token'] === 'string')
    );
  }

  async login(address: string, signature: string, message: string, emailTicket?: string): Promise<LoginResponse> {
    const body: { address: string; signature: string; message: string; emailTicket?: string } = {
      address,
      signature,
      message,
    };
    if (emailTicket && emailTicket.trim().length > 0) {
      body.emailTicket = emailTicket.trim();
    }
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.post<unknown>(`${this.baseUrl}/login`, body),
        ),
      ),
      'Login failed',
    );
    if (!this.isLoginResponse(payload)) {
      throw new Error('Invalid login response payload');
    }
    return payload;
  }

  async getMe(): Promise<{
    address: string;
    email?: string;
    emailVerified?: boolean;
    lastLoginIp?: string;
  }> {
    const payload = await this.unwrap(
      firstValueFrom(this.bounded(this.http.get<unknown>(`${this.apiRoot}/profile/me`))),
      'Failed to fetch profile',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid profile response payload');
    }
    const record = payload as Record<string, unknown>;
    if (typeof record['address'] !== 'string') {
      throw new Error('Invalid profile response payload');
    }
    const out: { address: string; email?: string; emailVerified?: boolean; lastLoginIp?: string } = {
      address: record['address'],
    };
    if (typeof record['email'] === 'string') {
      out.email = record['email'];
    }
    if (typeof record['emailVerified'] === 'boolean') {
      out.emailVerified = record['emailVerified'];
    }
    if (typeof record['lastLoginIp'] === 'string') {
      out.lastLoginIp = record['lastLoginIp'];
    }
    return out;
  }

  async getAdminHealth(cancel$?: Observable<unknown>): Promise<{ status: string; scope: string }> {
    const payload = await this.unwrap(
      firstValueFrom(this.bounded(this.http.get<unknown>(`${this.apiRoot}/admin/health`), cancel$)),
      'Failed to fetch admin health',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid admin health response payload');
    }
    const record = payload as Record<string, unknown>;
    if (typeof record['status'] !== 'string' || typeof record['scope'] !== 'string') {
      throw new Error('Invalid admin health response payload');
    }
    return { status: record['status'], scope: record['scope'] };
  }

  async getAdminLoginStats(since?: string, cancel$?: Observable<unknown>): Promise<{
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
  }> {
    const params = since ? new HttpParams().set('since', since) : undefined;
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.get<unknown>(`${this.apiRoot}/admin/stats`, {
            ...(params ? { params } : {}),
          }),
          cancel$,
        ),
      ),
      'Failed to fetch login stats',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid login stats response payload');
    }
    const record = payload as Record<string, unknown>;
    if (
      typeof record['totalAttempts'] !== 'number' ||
      typeof record['successfulAttempts'] !== 'number' ||
      typeof record['failedAttempts'] !== 'number'
    ) {
      throw new Error('Invalid login stats response payload');
    }
    return {
      totalAttempts: record['totalAttempts'],
      successfulAttempts: record['successfulAttempts'],
      failedAttempts: record['failedAttempts'],
    };
  }

  async getLoginHistory(since?: string, cancel$?: Observable<unknown>): Promise<
    {
      id: number;
      address: string;
      successful: boolean;
      failureReason: string | null;
      createdAt: string;
      clientIp?: string | null;
    }[]
  > {
    const params = since ? new HttpParams().set('since', since) : undefined;
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.get<unknown[]>(`${this.apiRoot}/admin/login-history`, {
            ...(params ? { params } : {}),
          }),
          cancel$,
        ),
      ),
      'Failed to fetch login history',
    );
    if (!Array.isArray(payload)) {
      throw new Error('Invalid login history response payload');
    }
    return payload.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid login history response payload');
      }
      const record = item as Record<string, unknown>;
      if (
        typeof record['id'] !== 'number' ||
        typeof record['address'] !== 'string' ||
        typeof record['successful'] !== 'boolean' ||
        (record['failureReason'] !== null &&
          record['failureReason'] !== undefined &&
          typeof record['failureReason'] !== 'string') ||
        typeof record['createdAt'] !== 'string'
      ) {
        throw new Error('Invalid login history response payload');
      }
      const row: {
        id: number;
        address: string;
        successful: boolean;
        failureReason: string | null;
        createdAt: string;
        clientIp?: string | null;
      } = {
        id: record['id'],
        address: record['address'],
        successful: record['successful'],
        failureReason: (record['failureReason'] ?? null) as string | null,
        createdAt: record['createdAt'],
      };
      if (typeof record['clientIp'] === 'string' || record['clientIp'] === null) {
        row.clientIp = record['clientIp'] as string | null;
      }
      return row;
    });
  }

  async getAdminIpEvents(risk?: string, cancel$?: Observable<unknown>): Promise<
    {
      id: number;
      ip: string;
      riskLevel: string;
      reason: string;
      path: string;
      httpMethod: string;
      requestId: string;
      createdAt: string;
      details: string | null;
    }[]
  > {
    const params = risk ? new HttpParams().set('risk', risk) : undefined;
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.get<unknown[]>(`${this.apiRoot}/admin/ip-events`, {
            ...(params ? { params } : {}),
          }),
          cancel$,
        ),
      ),
      'Failed to load IP risk events',
    );
    if (!Array.isArray(payload)) {
      throw new Error('Invalid IP events response');
    }
    return payload.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid IP events response');
      }
      const r = item as Record<string, unknown>;
      if (
        typeof r['id'] !== 'number' ||
        typeof r['ip'] !== 'string' ||
        typeof r['riskLevel'] !== 'string' ||
        typeof r['reason'] !== 'string' ||
        typeof r['path'] !== 'string' ||
        typeof r['httpMethod'] !== 'string' ||
        typeof r['requestId'] !== 'string' ||
        typeof r['createdAt'] !== 'string' ||
        (r['details'] !== null && r['details'] !== undefined && typeof r['details'] !== 'string')
      ) {
        throw new Error('Invalid IP events response');
      }
      return {
        id: r['id'],
        ip: r['ip'],
        riskLevel: r['riskLevel'],
        reason: r['reason'],
        path: r['path'],
        httpMethod: r['httpMethod'],
        requestId: r['requestId'],
        createdAt: r['createdAt'],
        details: (r['details'] ?? null) as string | null,
      };
    });
  }

  async getAdminIpBlocks(cancel$?: Observable<unknown>): Promise<
    {
      ip: string;
      source: string;
      reason: string;
      blockedUntil: string | null;
      createdAt: string;
      createdBy: string | null;
    }[]
  > {
    const payload = await this.unwrap(
      firstValueFrom(this.bounded(this.http.get<unknown[]>(`${this.apiRoot}/admin/ip-blocks`), cancel$)),
      'Failed to load IP block list',
    );
    if (!Array.isArray(payload)) {
      throw new Error('Invalid IP blocks response');
    }
    return payload.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid IP blocks response');
      }
      const r = item as Record<string, unknown>;
      if (
        typeof r['ip'] !== 'string' ||
        typeof r['source'] !== 'string' ||
        typeof r['reason'] !== 'string' ||
        (r['blockedUntil'] !== null &&
          r['blockedUntil'] !== undefined &&
          typeof r['blockedUntil'] !== 'string') ||
        typeof r['createdAt'] !== 'string' ||
        (r['createdBy'] !== null && r['createdBy'] !== undefined && typeof r['createdBy'] !== 'string')
      ) {
        throw new Error('Invalid IP blocks response');
      }
      return {
        ip: r['ip'],
        source: r['source'],
        reason: r['reason'],
        blockedUntil: (r['blockedUntil'] ?? null) as string | null,
        createdAt: r['createdAt'],
        createdBy: (r['createdBy'] ?? null) as string | null,
      };
    });
  }

  async adminBlockIp(
    ip: string,
    reason: string,
    permanent: boolean,
    cancel$?: Observable<unknown>,
  ): Promise<{ status: string; ip: string }> {
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.post<unknown>(`${this.apiRoot}/admin/ip-blocks`, { ip, reason, permanent }),
          cancel$,
        ),
      ),
      'Failed to block IP',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid block IP response');
    }
    const r = payload as Record<string, unknown>;
    if (typeof r['status'] !== 'string' || typeof r['ip'] !== 'string') {
      throw new Error('Invalid block IP response');
    }
    return { status: r['status'], ip: r['ip'] };
  }

  async adminUnblockIp(ip: string, cancel$?: Observable<unknown>): Promise<{ status: string; ip: string }> {
    const encoded = encodeURIComponent(ip);
    const payload = await this.unwrap(
      firstValueFrom(this.bounded(this.http.delete<unknown>(`${this.apiRoot}/admin/ip-blocks/${encoded}`), cancel$)),
      'Failed to unblock IP',
    );
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid unblock IP response');
    }
    const r = payload as Record<string, unknown>;
    if (typeof r['status'] !== 'string' || typeof r['ip'] !== 'string') {
      throw new Error('Invalid unblock IP response');
    }
    return { status: r['status'], ip: r['ip'] };
  }

  async getAdminAccessLog(cancel$?: Observable<unknown>): Promise<
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
  > {
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(this.http.get<unknown[]>(`${this.apiRoot}/admin/access-log`), cancel$),
      ),
      'Failed to fetch access log',
    );
    if (!Array.isArray(payload)) {
      throw new Error('Invalid access log response payload');
    }
    return payload.map((item) => {
      if (!item || typeof item !== 'object') {
        throw new Error('Invalid access log response payload');
      }
      const record = item as Record<string, unknown>;
      if (
        typeof record['id'] !== 'number' ||
        typeof record['createdAt'] !== 'string' ||
        typeof record['requestId'] !== 'string' ||
        typeof record['httpMethod'] !== 'string' ||
        typeof record['path'] !== 'string' ||
        typeof record['statusCode'] !== 'number' ||
        typeof record['durationMs'] !== 'number' ||
        (record['principal'] !== null &&
          record['principal'] !== undefined &&
          typeof record['principal'] !== 'string')
      ) {
        throw new Error('Invalid access log response payload');
      }
      return {
        id: record['id'],
        createdAt: record['createdAt'],
        requestId: record['requestId'],
        httpMethod: record['httpMethod'],
        path: record['path'],
        statusCode: record['statusCode'],
        durationMs: record['durationMs'],
        principal: (record['principal'] ?? null) as string | null,
      };
    });
  }
}

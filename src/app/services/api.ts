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

  async getNonce(address: string): Promise<string> {
    const params = new HttpParams().set('address', address);
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

  async login(address: string, signature: string, message: string): Promise<LoginResponse> {
    const payload = await this.unwrap(
      firstValueFrom(
        this.bounded(
          this.http.post<unknown>(`${this.baseUrl}/login`, {
            address,
            signature,
            message,
          }),
        ),
      ),
      'Login failed',
    );
    if (!this.isLoginResponse(payload)) {
      throw new Error('Invalid login response payload');
    }
    return payload;
  }

  async getMe(): Promise<{ address: string }> {
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
    return { address: record['address'] };
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
    { id: number; address: string; successful: boolean; failureReason: string | null; createdAt: string }[]
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
      return {
        id: record['id'],
        address: record['address'],
        successful: record['successful'],
        failureReason: (record['failureReason'] ?? null) as string | null,
        createdAt: record['createdAt'],
      };
    });
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

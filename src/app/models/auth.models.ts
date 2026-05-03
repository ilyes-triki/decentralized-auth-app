export type UserRole = 'admin' | 'user';

export interface AuthUser {
  address: string;
  role: UserRole;
  token?: string;
}

export interface LoginResponse {
  address: string;
  role: UserRole;
  token?: string;
}

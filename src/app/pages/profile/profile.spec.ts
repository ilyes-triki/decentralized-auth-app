import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ApiService } from '../../services/api';

import { Profile } from './profile';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let authMock: { getUser: () => { address: string; role: 'admin' | 'user'; token?: string } | null; getToken: () => string | null; logout: () => void };
  let apiMock: { getMe: () => Promise<{ address: string }> };
  let routerMock: { navigate: (commands: string[]) => Promise<boolean> };

  beforeEach(async () => {
    authMock = {
      getUser: () => ({ address: '0xabc', role: 'user', token: 'jwt' }),
      getToken: () => 'jwt',
      logout: () => {},
    };
    apiMock = {
      getMe: async () => ({ address: '0xabc' }),
    };
    routerMock = {
      navigate: async () => true,
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should verify server session on init when token exists', async () => {
    await component.verifyServerSession();

    expect(component.serverAddress).toBe('0xabc');
    expect(component.verifyError).toBe('');
  });

  it('should set error when no token exists', async () => {
    authMock.getToken = () => null;

    await component.verifyServerSession();

    expect(component.verifyError).toContain('No token');
  });
});

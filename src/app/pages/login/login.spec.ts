import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth';
import { Web3Service } from '../../services/web3';
import { ApiService } from '../../services/api';
import { ToastService } from '../../services/toast.service';

import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;
  let authMock: {
    getUser: () => { address: string; role: 'admin' | 'user' } | null;
    loginWithWallet: (address: string, role: 'admin' | 'user', token?: string) => void;
  };
  let web3Mock: {
    hasEthereumProvider: () => boolean;
    connectWalletOnly: () => Promise<string[]>;
    signMessage: (address: string, message: string) => Promise<string>;
  };
  let apiMock: {
    startEmailOtp: ReturnType<typeof vi.fn>;
    verifyEmailOtp: ReturnType<typeof vi.fn>;
    getEmailStatus: ReturnType<typeof vi.fn>;
    getNonce: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authMock = {
      getUser: () => null,
      loginWithWallet: () => {},
    };
    web3Mock = {
      hasEthereumProvider: () => true,
      connectWalletOnly: async () => ['0xabc'],
      signMessage: async () => '0xsig',
    };
    apiMock = {
      startEmailOtp: vi.fn().mockResolvedValue({ message: 'ok' }),
      verifyEmailOtp: vi.fn().mockResolvedValue({ emailTicket: 'ticket123', expiresInSeconds: 900 }),
      getEmailStatus: vi.fn().mockResolvedValue({
        verified: true,
        linked: true,
        accountBlocked: false,
        email: 'x@example.com',
      }),
      getNonce: vi.fn().mockResolvedValue('nonce'),
      login: vi.fn().mockResolvedValue({ address: '0xabc', role: 'user', token: 'jwt' }),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: Web3Service, useValue: web3Mock },
        { provide: ApiService, useValue: apiMock },
        ToastService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set inline error when wallet provider is missing', async () => {
    web3Mock.hasEthereumProvider = () => true;
    web3Mock.connectWalletOnly = async () => {
      throw new Error('Ethereum provider not found');
    };
    component.loginStep = 3;
    component.emailTicket = 't';

    await component.connectWallet();

    expect(component.errorMessage).toBe('MetaMask is not available in this browser.');
    expect(component.isConnecting).toBe(false);
  });

  it('should set rejected-request message for wallet code 4001', async () => {
    web3Mock.hasEthereumProvider = () => true;
    web3Mock.connectWalletOnly = async () => {
      throw { code: 4001 };
    };
    component.loginStep = 3;
    component.emailTicket = 't';

    await component.connectWallet();

    expect(component.errorMessage).toBe('Wallet request was rejected.');
    expect(component.isConnecting).toBe(false);
  });

  it('should login and navigate on successful auth flow', async () => {
    let loginCalledWith: { address: string; role: 'admin' | 'user'; token?: string } | null = null;
    authMock.loginWithWallet = (address: string, role: 'admin' | 'user', token?: string) => {
      loginCalledWith = { address, role, token };
    };

    component.loginStep = 3;
    component.emailTicket = 'ticket';

    await component.connectWallet();

    expect(component.errorMessage).toBe('');
    expect(component.isConnecting).toBe(false);
    expect(loginCalledWith).toEqual({ address: '0xabc', role: 'user', token: 'jwt' });
    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    expect(apiMock.getNonce).toHaveBeenCalledWith('0xabc', 'ticket');
    expect(apiMock.login).toHaveBeenCalledWith('0xabc', '0xsig', 'nonce', 'ticket');
  });

  it('should navigate to wallet setup when provider is missing', async () => {
    web3Mock.hasEthereumProvider = () => false;
    vi.mocked(router.navigate).mockClear();
    component.loginStep = 3;

    await component.connectWallet();

    expect(component.hasWalletProvider).toBe(false);
    expect(component.isConnecting).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/wallet-setup']);
  });

  it('should require OTP for wallet not previously verified', async () => {
    apiMock.getEmailStatus.mockResolvedValue({ verified: false, linked: false, accountBlocked: false, email: null });
    component.loginStep = 3;
    component.emailTicket = '';

    await component.connectWallet();

    expect(component.errorMessage).toContain('not linked to a verified email');
    expect(component.loginStep).toBe(1);
    expect(apiMock.getNonce).not.toHaveBeenCalled();
  });
});

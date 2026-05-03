import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../services/auth';
import { Web3Service } from '../../services/web3';
import { ApiService } from '../../services/api';

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
    getNonce: (address: string) => Promise<string>;
    login: (address: string, signature: string, message: string) => Promise<{ address: string; role: 'admin' | 'user'; token?: string }>;
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
      getNonce: async () => 'nonce',
      login: async () => ({ address: '0xabc', role: 'user', token: 'jwt' }),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: Web3Service, useValue: web3Mock },
        { provide: ApiService, useValue: apiMock },
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

    await component.connectWallet();

    expect(component.errorMessage).toBe('MetaMask is not available in this browser.');
    expect(component.isConnecting).toBe(false);
  });

  it('should set rejected-request message for wallet code 4001', async () => {
    web3Mock.hasEthereumProvider = () => true;
    web3Mock.connectWalletOnly = async () => {
      throw { code: 4001 };
    };

    await component.connectWallet();

    expect(component.errorMessage).toBe('Wallet request was rejected.');
    expect(component.isConnecting).toBe(false);
  });

  it('should login and navigate on successful auth flow', async () => {
    let loginCalledWith: { address: string; role: 'admin' | 'user'; token?: string } | null = null;
    authMock.loginWithWallet = (address: string, role: 'admin' | 'user', token?: string) => {
      loginCalledWith = { address, role, token };
    };

    await component.connectWallet();

    expect(component.errorMessage).toBe('');
    expect(component.isConnecting).toBe(false);
    expect(loginCalledWith).toEqual({ address: '0xabc', role: 'user', token: 'jwt' });
    expect(router.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should navigate to wallet setup when provider is missing', async () => {
    web3Mock.hasEthereumProvider = () => false;
    vi.mocked(router.navigate).mockClear();

    await component.connectWallet();

    expect(component.hasWalletProvider).toBe(false);
    expect(component.isConnecting).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/wallet-setup']);
  });
});

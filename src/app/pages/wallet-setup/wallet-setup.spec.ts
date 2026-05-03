import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { Web3Service } from '../../services/web3';
import { WalletSetup } from './wallet-setup';

describe('WalletSetup', () => {
  let component: WalletSetup;
  let fixture: ComponentFixture<WalletSetup>;
  let router: Router;
  let web3Mock: { hasEthereumProvider: () => boolean };

  beforeEach(async () => {
    web3Mock = {
      hasEthereumProvider: () => true,
    };

    await TestBed.configureTestingModule({
      imports: [WalletSetup],
      providers: [
        provideRouter([]),
        { provide: Web3Service, useValue: web3Mock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(WalletSetup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error message when provider is not detected', async () => {
    web3Mock.hasEthereumProvider = () => false;

    await component.verifySetup();

    expect(component.isSuccess).toBe(false);
    expect(component.statusMessage).toContain('still not detected');
    expect(component.isChecking).toBe(false);
  });

  it('should navigate to sign-in when provider is detected', async () => {
    await component.verifySetup();

    expect(component.isSuccess).toBe(true);
    expect(component.statusMessage).toContain('MetaMask detected');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});

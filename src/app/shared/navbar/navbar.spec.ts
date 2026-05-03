import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth';

import { Navbar } from './navbar';

function authServiceMock(opts: { loggedIn: boolean; admin: boolean }) {
  return {
    isLoggedIn: () => opts.loggedIn,
    isAdmin: () => opts.admin,
    logout: () => {},
    getUser: () => null,
  };
}

describe('Navbar', () => {
  describe('logged in as user', () => {
    let fixture: ComponentFixture<Navbar>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [Navbar],
        providers: [
          { provide: AuthService, useValue: authServiceMock({ loggedIn: true, admin: false }) },
          provideRouter([]),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(Navbar);
      await fixture.whenStable();
    });

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should hide admin link for non-admin users', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const adminLink = Array.from(compiled.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Admin',
      );
      expect(adminLink).toBeUndefined();
    });
  });

  describe('logged in as admin', () => {
    let fixture: ComponentFixture<Navbar>;

    beforeEach(async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Navbar],
        providers: [
          { provide: AuthService, useValue: authServiceMock({ loggedIn: true, admin: true }) },
          provideRouter([]),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(Navbar);
      await fixture.whenStable();
    });

    it('should show admin link', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const adminLink = Array.from(compiled.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Admin',
      );
      expect(adminLink).toBeTruthy();
    });
  });

  describe('logged out', () => {
    let fixture: ComponentFixture<Navbar>;

    beforeEach(async () => {
      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [Navbar],
        providers: [
          { provide: AuthService, useValue: authServiceMock({ loggedIn: false, admin: false }) },
          provideRouter([]),
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(Navbar);
      await fixture.whenStable();
    });

    it('should show Sign in', () => {
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const signIn = Array.from(compiled.querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Sign in',
      );
      expect(signIn).toBeTruthy();
    });
  });
});

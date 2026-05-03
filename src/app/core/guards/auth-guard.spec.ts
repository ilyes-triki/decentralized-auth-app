import { TestBed } from '@angular/core/testing';

import { authGuard } from './auth-guard';

describe('authGuard', () => {
  const executeGuard = () => TestBed.runInInjectionContext(() => authGuard());

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

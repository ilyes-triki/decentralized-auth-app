import { TestBed } from '@angular/core/testing';

import { loginGuard } from './login-guard';

describe('loginGuard', () => {
  const executeGuard = () => TestBed.runInInjectionContext(() => loginGuard());

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

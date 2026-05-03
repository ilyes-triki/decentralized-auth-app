import { TestBed } from '@angular/core/testing';

import { roleGuard } from './role-guard';

describe('roleGuard', () => {
  const executeGuard = () => TestBed.runInInjectionContext(() => roleGuard());

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});

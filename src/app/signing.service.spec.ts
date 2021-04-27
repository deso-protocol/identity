import { TestBed } from '@angular/core/testing';

import { SigningService } from './signing.service';

describe('SigningService', () => {
  let service: SigningService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SigningService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { EntropyService } from './entropy.service';

describe('EntropyService', () => {
  let service: EntropyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EntropyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

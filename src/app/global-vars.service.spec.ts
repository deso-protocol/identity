import { TestBed } from '@angular/core/testing';

import { GlobalVarsService } from './global-vars.service';

describe('GlobalVarsService', () => {
  let service: GlobalVarsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalVarsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

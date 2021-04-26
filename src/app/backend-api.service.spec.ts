import { TestBed } from '@angular/core/testing';

import { BackendAPIService } from './backend-api.service';
import {HttpClientTestingModule} from '@angular/common/http/testing';

describe('BackendAPIService', () => {
  let service: BackendAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ HttpClientTestingModule ],
    });
    service = TestBed.inject(BackendAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

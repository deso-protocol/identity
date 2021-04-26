import { TestBed } from '@angular/core/testing';

import { CryptoService } from './crypto.service';
import {CookieModule} from 'ngx-cookie';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ CookieModule.forRoot() ],
    });
    service = TestBed.inject(CryptoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { AccountService } from './account.service';
import {CookieModule} from 'ngx-cookie';

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ CookieModule.forRoot() ],
    });
    service = TestBed.inject(AccountService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

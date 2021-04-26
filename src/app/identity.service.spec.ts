import { TestBed } from '@angular/core/testing';

import { IdentityService } from './identity.service';

describe('IdentityService', () => {
  let service: IdentityService;
  let handleMessage: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IdentityService);
    handleMessage = spyOn<any>(service, 'handleMessage').and.callThrough();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('receives initialize', () => {
    service.initialize();

    handleMessage.call(service, {
      data: {
        service: 'identity',
      }
    });

  });
});

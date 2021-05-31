import { TestBed } from '@angular/core/testing';

import { GoogleDriveService } from './google-drive.service';

describe('GoogleDriveService', () => {
  let service: GoogleDriveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleDriveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

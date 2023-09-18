import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportSeedDialogComponent } from './export-seed-dialog.component';

describe('ExportSeedDialogComponent', () => {
  let component: ExportSeedDialogComponent;
  let fixture: ComponentFixture<ExportSeedDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ExportSeedDialogComponent]
    });
    fixture = TestBed.createComponent(ExportSeedDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

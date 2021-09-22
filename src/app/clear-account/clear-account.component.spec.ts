import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClearAccountComponent } from './clear-account.component';

describe('ClearAccountComponent', () => {
  let component: ClearAccountComponent;
  let fixture: ComponentFixture<ClearAccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ClearAccountComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ClearAccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

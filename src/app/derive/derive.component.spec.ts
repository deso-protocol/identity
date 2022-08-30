import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeriveComponent } from './derive.component';

describe('DeriveComponent', () => {
  let component: DeriveComponent;
  let fixture: ComponentFixture<DeriveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeriveComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeriveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

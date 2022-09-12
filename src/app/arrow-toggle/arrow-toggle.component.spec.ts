import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArrowToggleComponent } from './arrow-toggle.component';

describe('ArrowToggleComponent', () => {
  let component: ArrowToggleComponent;
  let fixture: ComponentFixture<ArrowToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArrowToggleComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ArrowToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JumioSuccessComponent } from './jumio-success.component';

describe('JumioSuccessComponent', () => {
  let component: JumioSuccessComponent;
  let fixture: ComponentFixture<JumioSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JumioSuccessComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JumioSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JumioErrorComponent } from './jumio-error.component';

describe('JumioErrorComponent', () => {
  let component: JumioErrorComponent;
  let fixture: ComponentFixture<JumioErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JumioErrorComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JumioErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorCallbackComponent } from './error-callback.component';

describe('ErrorCallbackComponent', () => {
  let component: ErrorCallbackComponent;
  let fixture: ComponentFixture<ErrorCallbackComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ErrorCallbackComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ErrorCallbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

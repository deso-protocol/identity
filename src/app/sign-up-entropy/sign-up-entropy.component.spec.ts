import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignUpEntropyComponent } from './sign-up-entropy.component';

describe('SignUpEntropyComponent', () => {
  let component: SignUpEntropyComponent;
  let fixture: ComponentFixture<SignUpEntropyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SignUpEntropyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUpEntropyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

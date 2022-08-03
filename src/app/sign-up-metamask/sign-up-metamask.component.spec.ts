import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignUpMetamaskComponent } from './sign-up-metamask.component';

describe('SignUpMetamaskComponent', () => {
  let component: SignUpMetamaskComponent;
  let fixture: ComponentFixture<SignUpMetamaskComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SignUpMetamaskComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUpMetamaskComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

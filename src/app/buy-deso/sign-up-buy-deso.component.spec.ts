import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignUpBuyDesoComponent } from './sign-up-buy-deso.component';

describe('SignUpBuyDesoComponent', () => {
  let component: SignUpBuyDesoComponent;
  let fixture: ComponentFixture<SignUpBuyDesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SignUpBuyDesoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUpBuyDesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

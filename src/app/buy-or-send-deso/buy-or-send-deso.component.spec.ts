import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuyOrSendDesoComponent } from './buy-or-send-deso.component';

describe('SignUpComponent', () => {
  let component: BuyOrSendDesoComponent;
  let fixture: ComponentFixture<BuyOrSendDesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BuyOrSendDesoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyOrSendDesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

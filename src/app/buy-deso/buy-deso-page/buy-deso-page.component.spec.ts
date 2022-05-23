import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BuyDesoPageComponent } from './buy-deso-page.component';

describe('BuyDeSoPageComponent', () => {
  let component: BuyDesoPageComponent;
  let fixture: ComponentFixture<BuyDesoPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDesoPageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDesoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

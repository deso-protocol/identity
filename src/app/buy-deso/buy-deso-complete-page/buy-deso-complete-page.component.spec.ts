import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BuyDeSoCompletePageComponent } from './buy-deso-complete-page.component';

describe('BuyDeSoCompletePageComponent', () => {
  let component: BuyDeSoCompletePageComponent;
  let fixture: ComponentFixture<BuyDeSoCompletePageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BuyDeSoCompletePageComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuyDeSoCompletePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

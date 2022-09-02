import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSelectComponent } from './account-select.component';

describe('AccountSelectComponent', () => {
  let component: AccountSelectComponent;
  let fixture: ComponentFixture<AccountSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountSelectComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

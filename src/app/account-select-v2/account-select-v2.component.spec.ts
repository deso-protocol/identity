import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountSelectV2Component } from './account-select-v2.component';

describe('AccountSelectV2Component', () => {
  let component: AccountSelectV2Component;
  let fixture: ComponentFixture<AccountSelectV2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AccountSelectV2Component]
    });
    fixture = TestBed.createComponent(AccountSelectV2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionSpendingLimitComponent } from './transaction-spending-limit.component';

describe('TransactionSpendingLimitComponent', () => {
  let component: TransactionSpendingLimitComponent;
  let fixture: ComponentFixture<TransactionSpendingLimitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TransactionSpendingLimitComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TransactionSpendingLimitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecoverySecretComponent } from './recovery-secret.component';

describe('RecoverySecretComponent', () => {
  let component: RecoverySecretComponent;
  let fixture: ComponentFixture<RecoverySecretComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RecoverySecretComponent]
    });
    fixture = TestBed.createComponent(RecoverySecretComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

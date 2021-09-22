import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedSecretComponent } from './shared-secret.component';

describe('SharedSecretComponent', () => {
  let component: SharedSecretComponent;
  let fixture: ComponentFixture<SharedSecretComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SharedSecretComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SharedSecretComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

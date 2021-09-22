import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetSharedSecretComponent } from './get-shared-secret.component';

describe('GetSharedSecretComponent', () => {
  let component: GetSharedSecretComponent;
  let fixture: ComponentFixture<GetSharedSecretComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GetSharedSecretComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GetSharedSecretComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

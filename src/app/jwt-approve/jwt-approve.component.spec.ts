import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JwtApproveComponent } from './jwt-approve.component';

describe('JwtApproveComponent', () => {
  let component: JwtApproveComponent;
  let fixture: ComponentFixture<JwtApproveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JwtApproveComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JwtApproveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

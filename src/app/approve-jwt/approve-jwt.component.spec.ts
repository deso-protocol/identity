import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApproveJwtComponent } from './approve-jwt.component';

describe('ApproveJwtComponent', () => {
  let component: ApproveJwtComponent;
  let fixture: ComponentFixture<ApproveJwtComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApproveJwtComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApproveJwtComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

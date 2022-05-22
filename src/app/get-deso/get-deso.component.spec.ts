import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GetDesoComponent } from './sign-up.component';

describe('SignUpComponent', () => {
  let component: GetDesoComponent;
  let fixture: ComponentFixture<GetDesoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GetDesoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GetDesoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

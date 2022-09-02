import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogInOptionsComponent } from './log-in-options.component';

describe('LogInOptionsComponent', () => {
  let component: LogInOptionsComponent;
  let fixture: ComponentFixture<LogInOptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LogInOptionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LogInOptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

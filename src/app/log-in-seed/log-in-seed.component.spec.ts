import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogInSeedComponent } from './log-in-seed.component';

describe('LogInSeedComponent', () => {
  let component: LogInSeedComponent;
  let fixture: ComponentFixture<LogInSeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [LogInSeedComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LogInSeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

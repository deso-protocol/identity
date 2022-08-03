import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JumioComponent } from './jumio.component';

describe('JumioComponent', () => {
  let component: JumioComponent;
  let fixture: ComponentFixture<JumioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JumioComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JumioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

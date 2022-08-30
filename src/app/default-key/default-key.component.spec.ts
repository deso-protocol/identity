import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DefaultKeyComponent } from './default-key.component';

describe('DefaultKeyComponent', () => {
  let component: DefaultKeyComponent;
  let fixture: ComponentFixture<DefaultKeyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DefaultKeyComponent ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DefaultKeyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

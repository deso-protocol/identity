import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayQueryParamMessageComponent } from './display-query-param-message.component';

describe('DisplayQueryParamMessageComponent', () => {
  let component: DisplayQueryParamMessageComponent;
  let fixture: ComponentFixture<DisplayQueryParamMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DisplayQueryParamMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DisplayQueryParamMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

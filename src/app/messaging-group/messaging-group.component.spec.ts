import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessagingGroupComponent } from './messaging-group.component';

describe('MessagingGroupComponent', () => {
  let component: MessagingGroupComponent;
  let fixture: ComponentFixture<MessagingGroupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MessagingGroupComponent ]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MessagingGroupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

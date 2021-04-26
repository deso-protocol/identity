import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmbedComponent } from './embed.component';

describe('EmbedComponent', () => {
  let component: EmbedComponent;
  let fixture: ComponentFixture<EmbedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmbedComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EmbedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

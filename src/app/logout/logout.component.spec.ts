import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LogoutComponent } from './logout.component';
import {RouterTestingModule} from '@angular/router/testing';
import {CookieModule} from 'ngx-cookie';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {BannerComponent} from '../banner/banner.component';

describe('LogoutComponent', () => {
  let component: LogoutComponent;
  let fixture: ComponentFixture<LogoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LogoutComponent, BannerComponent ],
      imports: [
        RouterTestingModule,
        CookieModule.forRoot(),
        HttpClientTestingModule,
      ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LogoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

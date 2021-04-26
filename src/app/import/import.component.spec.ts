import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportComponent } from './import.component';
import {CookieModule} from 'ngx-cookie';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {BannerComponent} from '../banner/banner.component';

describe('ImportComponent', () => {
  let component: ImportComponent;
  let fixture: ComponentFixture<ImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportComponent, BannerComponent ],
      imports: [
        CookieModule.forRoot(),
        HttpClientTestingModule,
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

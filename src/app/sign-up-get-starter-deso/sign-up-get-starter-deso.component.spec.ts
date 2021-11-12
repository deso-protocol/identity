import { ComponentFixture, TestBed } from "@angular/core/testing";

import { SignUpGetStarterDESOComponent } from "./sign-up-get-starter-deso.component";

describe("SignUpGetStarterDESOComponent", () => {
  let component: SignUpGetStarterDESOComponent;
  let fixture: ComponentFixture<SignUpGetStarterDESOComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SignUpGetStarterDESOComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUpGetStarterDESOComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});

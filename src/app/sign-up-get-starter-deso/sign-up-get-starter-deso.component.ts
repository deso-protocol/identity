import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CountryISO } from 'ngx-intl-tel-input';
import { GlobalVarsService } from '../global-vars.service';
import { BackendAPIService, User } from '../backend-api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { IdentityService } from '../identity.service';
import { AccountService } from '../account.service';
import { RouteNames } from '../app-routing.module';

@Component({
  selector: 'sign-up-get-starter-deso',
  templateUrl: './sign-up-get-starter-deso.component.html',
  styleUrls: ['./sign-up-get-starter-deso.component.scss'],
})
export class SignUpGetStarterDESOComponent implements OnInit {
  static CREATE_PHONE_NUMBER_VERIFICATION_SCREEN =
    'create_phone_number_verification_screen';
  static SUBMIT_PHONE_NUMBER_VERIFICATION_SCREEN =
    'submit_phone_number_verification_screen';
  static COMPLETED_PHONE_NUMBER_VERIFICATION_SCREEN =
    'completed_phone_number_verification_screen';

  @Input() displayForSignupFlow = false;
  @Input() publicKey = '';
  @Input() skipAppBanner = false;
  @Input() finishFlowEventOnly = false;
  @Output() backToPreviousSignupStepClicked = new EventEmitter();
  @Output() phoneNumberVerified = new EventEmitter();
  @Output() skipButtonClicked = new EventEmitter();
  @Output() finishFlowEvent = new EventEmitter();
  @Output() onCancelButtonClicked = new EventEmitter();

  phoneForm = new FormGroup({
    phone: new FormControl(undefined, [Validators.required]),
  });
  verificationCodeForm = new FormGroup({
    verificationCode: new FormControl(undefined, [Validators.required]),
  });

  CountryISO = CountryISO;
  sendingPhoneNumberVerificationText = false;
  submittingPhoneNumberVerificationCode = false;
  screenToShow: string | null = null;
  SignUpGetStarterDESOComponent = SignUpGetStarterDESOComponent;
  phoneNumber = '';
  phoneNumberCountryCode: string | null = null;
  resentVerificationCode = false;
  resentVerificationCodeTimeout = 0;
  resentVerificationInterval: any;
  sendPhoneNumberVerificationTextServerErrors =
    new SendPhoneNumberVerificationTextServerErrors();
  submitPhoneNumberVerificationCodeServerErrors =
    new SubmitPhoneNumberVerificationCodeServerErrors();
  user: User | null = null;
  loading = true;
  isPhoneNumberSuccess = false;

  constructor(
    public globalVars: GlobalVarsService,
    private backendApi: BackendAPIService,
    private activatedRoute: ActivatedRoute,
    private identityService: IdentityService,
    private accountService: AccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params.getFreeDeso) {
        this.displayForSignupFlow = params.getFreeDeso === 'true';
      }
      if (this.publicKey === '' && params.public_key) {
        this.publicKey = params.public_key;
      }
      if (this.publicKey !== '') {
        this.backendApi
          .GetUsersStateless([this.publicKey])
          .subscribe(
            (res) => {
              if (res.UserList?.length) {
                this.user = res.UserList[0];
                if (this.user?.HasPhoneNumber) {
                  this.screenToShow =
                    SignUpGetStarterDESOComponent.COMPLETED_PHONE_NUMBER_VERIFICATION_SCREEN;
                } else {
                  this.screenToShow =
                    SignUpGetStarterDESOComponent.CREATE_PHONE_NUMBER_VERIFICATION_SCREEN;
                }
              }
            },
            (err) => {
              console.error(err);
            }
          )
          .add(() => (this.loading = false));
      } else {
        this.loading = false;
      }
    });
  }

  backToPreviousSignupStepOnClick(): void {
    this.backToPreviousSignupStepClicked.emit();
  }

  backButtonClickedOnSubmitVerificationScreen(): void {
    this.screenToShow =
      SignUpGetStarterDESOComponent.CREATE_PHONE_NUMBER_VERIFICATION_SCREEN;
  }

  sendVerificationText(): void {
    if (this.phoneForm.invalid) {
      return;
    }

    this._sendPhoneNumberVerificationText();
  }

  resendVerificationCode(event: Event): boolean {
    event.stopPropagation();
    event.preventDefault();

    // Return if the user just resent the verification code (to prevent multiple unnecessary texts)
    if (this.resentVerificationCode) {
      return false;
    }

    // Clear any existing resend-related errors
    this.sendPhoneNumberVerificationTextServerErrors =
      new SendPhoneNumberVerificationTextServerErrors();

    this._sendPhoneNumberVerificationText();

    // Handle resend cooldown, set to 60 seconds.
    this.resentVerificationCode = true;
    this.resentVerificationCodeTimeout = 60;
    this.resentVerificationInterval = setInterval(() => {
      if (this.resentVerificationCodeTimeout === 0) {
        this.resentVerificationCode = false;
        clearInterval(this.resentVerificationInterval);
      } else {
        this.resentVerificationCodeTimeout--;
      }
    }, 1000);

    return false;
  }

  submitVerificationCode(): void {
    if (this.verificationCodeForm.invalid) {
      return;
    }

    this._submitPhoneNumberVerificationCode();
  }

  onSkipButtonClicked(): void {
    this.skipButtonClicked.emit();
  }

  onPhoneNumberInputChanged(): void {
    this.sendPhoneNumberVerificationTextServerErrors =
      new SendPhoneNumberVerificationTextServerErrors();
  }

  onVerificationCodeInputChanged(): void {
    this.submitPhoneNumberVerificationCodeServerErrors =
      new SubmitPhoneNumberVerificationCodeServerErrors();
  }

  _sendPhoneNumberVerificationText(): void {
    this.phoneNumber = this.phoneForm.value.phone?.e164Number;
    this.phoneNumberCountryCode = this.phoneForm.value.phone?.countryCode;
    if (!this.phoneNumberCountryCode) {
      return;
    }
    this.sendingPhoneNumberVerificationText = true;

    this.backendApi
      .SendPhoneNumberVerificationText(
        this.publicKey /*UpdaterPublicKeyBase58Check*/,
        this.phoneNumber /*PhoneNumber*/,
        this.phoneNumberCountryCode /*PhoneNumberCountryCode*/
      )
      .subscribe(
        (res) => {
          this.screenToShow =
            SignUpGetStarterDESOComponent.SUBMIT_PHONE_NUMBER_VERIFICATION_SCREEN;
        },
        (err) => {
          this._parseSendPhoneNumberVerificationTextServerErrors(err);
        }
      )
      .add(() => {
        this.sendingPhoneNumberVerificationText = false;
      });
  }

  _parseSendPhoneNumberVerificationTextServerErrors(err: any): void {
    if (err?.error?.error.includes('Phone number already in use')) {
      this.sendPhoneNumberVerificationTextServerErrors.phoneNumberAlreadyInUse =
        true;
    } else if (err?.error?.error.includes('Max send attempts reached')) {
      // https://www.twilio.com/docs/api/errors/60203
      this.sendPhoneNumberVerificationTextServerErrors.maxSendAttemptsReached =
        true;
    } else if (err?.error?.error.includes('VOIP number not allowed')) {
      this.sendPhoneNumberVerificationTextServerErrors.voipNumberNotAllowed =
        true;
    } else if (
      err?.error?.error.includes('Messages to China require use case vetting')
    ) {
      // https://www.twilio.com/docs/api/errors/60220
      this.sendPhoneNumberVerificationTextServerErrors.chineseNumberNotAllowed =
        true;
    } else {
      this.sendPhoneNumberVerificationTextServerErrors.unknownError = `Error sending phone number verification text: ${this.backendApi.stringifyError(
        err
      )}`;
    }
  }

  _parseSubmitPhoneNumberVerificationCodeServerErrors(err: any): void {
    if (err?.error?.error.includes('Invalid parameter: Code')) {
      // https://www.twilio.com/docs/api/errors/60200
      this.submitPhoneNumberVerificationCodeServerErrors.invalidCode = true;
    } else if (err?.error?.error.includes('requested resource')) {
      // https://www.twilio.com/docs/api/errors/20404
      this.submitPhoneNumberVerificationCodeServerErrors.invalidCode = true;
    } else if (err?.error?.error.includes('Code is not valid')) {
      this.submitPhoneNumberVerificationCodeServerErrors.invalidCode = true;
    } else if (err?.error?.error.includes('Max check attempts reached')) {
      // https://www.twilio.com/docs/api/errors/60202
      this.submitPhoneNumberVerificationCodeServerErrors.maxCheckAttemptsReached =
        true;
    } else {
      this.submitPhoneNumberVerificationCodeServerErrors.unknownError = `Error submitting phone number verification code: ${this.backendApi.stringifyError(
        err
      )}`;
    }
  }

  _submitPhoneNumberVerificationCode(): void {
    if (!this.phoneNumberCountryCode) {
      return;
    }
    this.submittingPhoneNumberVerificationCode = true;
    this.backendApi
      .SubmitPhoneNumberVerificationCode(
        this.publicKey /*UpdaterPublicKeyBase58Check*/,
        this.phoneNumber /*PhoneNumber*/,
        this.phoneNumberCountryCode /*PhoneNumberCountryCode*/,
        this.verificationCodeForm.value.verificationCode
      )
      .subscribe(
        (res) => {
          this.screenToShow =
            SignUpGetStarterDESOComponent.COMPLETED_PHONE_NUMBER_VERIFICATION_SCREEN;
          this.phoneNumberVerified.emit();
          this.isPhoneNumberSuccess = true;
        },
        (err) => {
          this._parseSubmitPhoneNumberVerificationCodeServerErrors(err);
        }
      )
      .add(() => (this.submittingPhoneNumberVerificationCode = false));
  }

  finishFlow(): void {
    this.finishFlowEvent.emit();
    if (!this.finishFlowEventOnly) {
      this.identityService.login({
        users: this.accountService.getEncryptedUsers(),
        publicKeyAdded: this.publicKey,
        signedUp: this.globalVars.signedUp,
        phoneNumberSuccess: this.isPhoneNumberSuccess,
      });
    }
  }

  cancelButtonClicked(): void {
    this.router.navigate(['/', RouteNames.GET_DESO], {
      queryParamsHandling: 'merge',
    });
  }
}

// Helper class
class SendPhoneNumberVerificationTextServerErrors {
  phoneNumberAlreadyInUse = false;
  maxSendAttemptsReached = false;
  voipNumberNotAllowed = false;
  chineseNumberNotAllowed = false;
  unknownError: boolean | string = false;
}

// Helper class
class SubmitPhoneNumberVerificationCodeServerErrors {
  invalidCode = false;
  maxCheckAttemptsReached = false;
  unknownError: boolean | string = false;
}

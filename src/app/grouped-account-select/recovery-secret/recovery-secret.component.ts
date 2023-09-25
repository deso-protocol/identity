import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'recovery-secret',
  templateUrl: './recovery-secret.component.html',
  styleUrls: ['./recovery-secret.component.scss'],
})
export class RecoverySecretComponent implements OnInit {
  @Input() secret = '';

  maskedSecret = '';
  isRevealed = false;
  copySuccess = false;

  ngOnInit(): void {
    this.maskedSecret = this.secret.replace(/\S/g, '*');
  }

  copySecret() {
    window.navigator.clipboard.writeText(this.secret).then(() => {
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 1500);
    });
  }

  toggleRevealSecret() {
    this.isRevealed = !this.isRevealed;
  }
}

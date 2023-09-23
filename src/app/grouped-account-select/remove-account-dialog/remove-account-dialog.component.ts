import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountService } from '../../account.service';

@Component({
  selector: 'remove-account-dialog',
  templateUrl: './remove-account-dialog.component.html',
  styleUrls: ['./remove-account-dialog.component.scss'],
})
export class RemoveAccountDialogComponent {
  copySuccess: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<RemoveAccountDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      publicKey: string;
      accountNumber: number;
      username?: string;
      isLastAccountInGroup: boolean;
    },
    private accountService: AccountService
  ) {}

  copyAccountNumber() {
    window.navigator.clipboard
      .writeText(this.data.accountNumber.toString())
      .then(() => {
        this.copySuccess = true;
        setTimeout(() => {
          this.copySuccess = false;
        }, 1500);
      });
  }

  cancel() {
    this.dialogRef.close(false);
  }

  confirm() {
    this.dialogRef.close(true);
  }
}

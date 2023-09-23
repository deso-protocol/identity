import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountService } from '../../account.service';

@Component({
  selector: 'backup-seed-dialog',
  templateUrl: './backup-seed-dialog.component.html',
  styleUrls: ['./backup-seed-dialog.component.scss'],
})
export class BackupSeedDialogComponent {
  step = 1;
  mnemonic?: string;
  extraText?: string;
  seedHex?: string;

  constructor(
    public dialogRef: MatDialogRef<BackupSeedDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rootPublicKey: string },
    private accountService: AccountService
  ) {}

  cancel(): void {
    this.dialogRef.close();
  }

  showSecrets() {
    if (!this.data.rootPublicKey) {
      throw new Error('Root public key is required');
    }

    const { mnemonic, extraText, seedHex } = this.accountService.getAccountInfo(
      this.data.rootPublicKey
    );
    this.mnemonic = mnemonic;
    this.extraText = extraText;
    this.seedHex = seedHex;
    this.step = 2;
  }

  showDisableBackupConfirmation() {
    this.step = 3;
  }

  disableBackup() {
    this.accountService.updateAccountInfo(this.data.rootPublicKey, {
      exportDisabled: true,
    });
    this.dialogRef.close();
  }
}

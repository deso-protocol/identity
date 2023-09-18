import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountService } from '../../account.service';


@Component({
  selector: 'export-seed-dialog',
  templateUrl: './export-seed-dialog.component.html',
  styleUrls: ['./export-seed-dialog.component.scss']
})
export class ExportSeedDialogComponent {
  secrets?: {
    mnemonic: string;
    extraText: string;
    seedHex: string;
  };

  constructor(
    public dialogRef: MatDialogRef<ExportSeedDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { rootPublicKey: string },
    private accountService: AccountService,
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onContinue() {
    if (!this.data.rootPublicKey) {
      throw new Error('Root public key is required');
    }

    const { mnemonic, extraText, seedHex } = this.accountService.getAccountInfo(this.data.rootPublicKey);
    this.secrets = { mnemonic, extraText, seedHex };
  }

  onDisableExport() {
    this.accountService.updateAccountInfo(this.data.rootPublicKey, { exportDisabled: true });
    this.dialogRef.close();
  }
}

import {Component, OnInit, Input, ChangeDetectorRef, Output, EventEmitter, OnChanges} from '@angular/core';
import { TemporaryEntropy, EntropyService } from '../entropy.service'
import * as bip39 from 'bip39';


@Component({
  selector: 'app-sign-up-entropy',
  templateUrl: './sign-up-entropy.component.html',
  styleUrls: ['./sign-up-entropy.component.scss']
})
export class SignUpEntropyComponent implements OnInit, OnChanges {

  constructor( public entropyService: EntropyService ) {
  }

  ngOnInit(): void {
  }

  ngOnChanges(changes: any): void {
  }

}

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { GlobalVarsService } from '../../global-vars.service';

@Component({
  selector: 'buy-deso-complete',
  templateUrl: './buy-deso-complete.component.html',
  styleUrls: ['./buy-deso-complete.component.scss'],
})
export class BuyDeSoCompleteComponent implements OnInit {
  @Output() buyMoreDeSoClicked = new EventEmitter();
  @Output() closeModal = new EventEmitter();

  amountOfDeSoBought = 0;

  constructor(
    private globalVars: GlobalVarsService
  ) {}

  triggerBuyMoreDeSo(): void {
    this.buyMoreDeSoClicked.emit();
  }

  close(): void {
    this.closeModal.emit();
  }

  ngOnInit(): void {
    window.scroll(0, 0);
  }
}

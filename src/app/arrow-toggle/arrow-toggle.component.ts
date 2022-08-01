import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-arrow-toggle',
  templateUrl: './arrow-toggle.component.html',
  styleUrls: ['./arrow-toggle.component.scss'],
})
export class ArrowToggleComponent {
  @Input() public toggle: boolean = false;
}

import { Component, Input, OnInit } from "@angular/core";
import { GlobalVarsService } from "../../global-vars.service";
import { Title } from "@angular/platform-browser";
import { environment } from "src/environments/environment";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "buy-deso-modal",
  templateUrl: "./buy-deso-modal.component.html",
  styleUrls: ["./buy-deso-modal.component.scss"],
})
export class BuyDesoModalComponent implements OnInit {
  @Input() activeTabInput: string = null;
  isLeftBarMobileOpen: boolean = false;
  showCloseButton: boolean = true;

  ngOnInit() {
    this.titleService.setTitle(`Buy $DESO - ${environment.node.name}`);
  }

  constructor(public globalVars: GlobalVarsService, private titleService: Title, public bsModalRef: BsModalRef) {}
}

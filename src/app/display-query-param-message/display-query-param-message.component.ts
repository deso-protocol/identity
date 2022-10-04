import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-display-query-param-message',
  templateUrl: './display-query-param-message.component.html',
  styleUrls: ['./display-query-param-message.component.scss'],
})
export class DisplayQueryParamMessageComponent {
  constructor(private activatedRoute: ActivatedRoute) {}
  messages$: Observable<string> = this.activatedRoute.queryParams.pipe(
    map((params: any) => {
      if (params?.requestDerivedCookieWithEncryptedSeed) {
        return 'Looks like you lost a cookie related to submitting your transaction. Log in to have it regenerated.';
      }
      return '';
    })
  );
}

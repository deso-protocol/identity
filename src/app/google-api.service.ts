import { Injectable } from '@angular/core';
import {Observable, Observer} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleApiService {
  private readonly gapiUrl: string = 'https://apis.google.com/js/api.js';
  private loaded = false;
  private node: HTMLScriptElement | undefined;
  private observers: Observer<boolean>[] = [];

  constructor() {
    this.onLoad().subscribe();
  }

  public onLoad(): Observable<boolean> {
    return this.loadGapi();
  }

  private loadGapi(): Observable<boolean> {
    return new Observable((observer: Observer<boolean>) => {
      if (this.loaded) {
        observer.next(true);
        observer.complete();
      } else if (!this.node) {
        // script element has not yet been added to document
        this.observers.push(observer);
        this.node = document.createElement('script');
        this.node.async = true;
        this.node.src = this.gapiUrl;
        this.node.type = 'text/javascript';
        this.node.onload = () => {
          this.loaded = true;
          for (const obs of this.observers) {
            obs.next(true);
            obs.complete();
          }
          this.node = undefined;
        };

        this.node.onerror = () => {
          this.node = undefined;
        };

        document.getElementsByTagName('head')[0].appendChild(this.node);
      } else {
        // script is in the middle of being loaded
        this.observers.push(observer);
      }
    });
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { RouteNames } from '../../app/app-routing.module';
import { AppComponent } from '../../app/app.component';

@Pipe({
  name: 'sanitizePostBody',
})
export class SanitizePostBodyPipe implements PipeTransform {
  transform(unsafeText: string, args?: any): any {
    // Escape to remove any HTML tags that may have been added by users
    //
    // TODO: We should audit this a bit more aggressively for
    // XSS issues Right now things are OK because all of the
    // usages are being set to innerHTML, which has its own advanced
    // escaping logic.
    let text = escapeHtml(unsafeText);

    // limit of two newlines in a row
    text = text.replace(/\n\n+/g, '\n\n');

    // display newlines
    text = text.replace(/\n/g, '<br>');

    return text;
  }
}

function escapeHtml(htmlContent: string): string {
  return htmlContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

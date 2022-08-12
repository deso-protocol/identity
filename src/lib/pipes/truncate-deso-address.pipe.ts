import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateAddress',
})
export class TruncateAddressPipe implements PipeTransform {
  transform(key: string | undefined) {
    if (!key) return '';
    if (key.length <= 12) {
      return key;
    }
    return `${key.substring(0, 7)}....${key.substring(
      key.length - 4,
      key.length
    )}`;
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { GlobalVarsService } from 'src/app/global-vars.service';

@Pipe({
  name: 'truncateAddress',
})
export class TruncateAddressPipe implements PipeTransform {
  constructor(public globalVars: GlobalVarsService) {}

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

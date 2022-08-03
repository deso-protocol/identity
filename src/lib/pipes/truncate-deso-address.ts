import { Pipe, PipeTransform } from '@angular/core';
import { GlobalVarsService } from 'src/app/global-vars.service';

@Pipe({
  name: 'truncateAddress',
})
export class TruncateAddress implements PipeTransform {
  constructor(public globalVars: GlobalVarsService) {}

  transform(publicAddress: string | undefined) {
    if (publicAddress === undefined) return '';
    if (publicAddress.length <= 12) {
      return key;
    }
    return `${publicAddress.substring(0, 7)}....${publicAddress.substring(
      publicAddress.length - 4,
      publicAddress.length
    )}`;
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { GlobalVarsService } from 'src/app/global-vars.service';

@Pipe({
  name: 'truncateAddress',
})
export class TruncateAddress implements PipeTransform {
  constructor(public globalVars: GlobalVarsService) {}

  transform(publicAddress: string | undefined) {
    if (publicAddress === undefined) return '';
    return this.globalVars.truncateAddress(publicAddress);
  }
}

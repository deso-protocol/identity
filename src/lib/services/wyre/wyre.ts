import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalVarsService } from '../../../app/global-vars.service';
import { BackendAPIService } from '../../../app/backend-api.service';

@Injectable({
  providedIn: 'root',
})
export class WyreService {
  constructor(
    private httpClient: HttpClient,
    private globalVars: GlobalVarsService,
    private backendAPIService: BackendAPIService
  ) {}

  _supportedFiatCurrencies: { [k: string]: string } = {
    USD: 'United States Dollar',
    EUR: 'Euro',
    GBP: 'British Pound Sterling',
    AUD: 'Australian Dollar',
    CAD: 'Canadian Dollar',
    NZD: 'New Zealand Dollar',
    ARS: 'Argentine Peso',
    BRL: 'Brazilian Real',
    CHF: 'Swiss Franc',
    CLP: 'Chilean Peso',
    COP: 'Colombian Peso',
    CZK: 'Czech Koruna',
    DKK: 'Danish Krone',
    HKD: 'Hong Kong Dollar',
    ILS: 'Israeli New Shekel',
    INR: 'Indian Rupee',
    ISK: 'Icelandic Krona',
    JPY: 'Japanese Yen',
    KRW: 'South Korean Won',
    MXN: 'Mexican Peso',
    MYR: 'Malaysian Ringgit',
    NOK: 'Norwegian Krone',
    PHP: 'Philippine Peso',
    PLN: 'Polish Zloty',
    SEK: 'Swedish Krona',
    SGD: 'Singapore Dollar',
    THB: 'Thai Baht',
    TRY: 'Turkish Lira',
    VND: 'Vietnamese Dong',
    ZAR: 'South African Rand',
  };

  makeWalletOrderReservation(
    publicKeyBase58Check: string,
    sourceAmount: number,
    country: string,
    fiatCurrency: string,
    redirectURL: string = ''): Observable<any> {
    return this.backendAPIService.GetWyreWalletOrderReservation(
      publicKeyBase58Check,
      sourceAmount,
      country,
      fiatCurrency,
      redirectURL,
    );
  }

  makeWalletOrderQuotation(sourceAmount: number, country: string, fiatCurrency: string): Observable<any> {
    return this.backendAPIService.GetWyreWalletOrderQuotation(sourceAmount, country, fiatCurrency);
  }

  getSupportedFiatCurrencies(): { [k: string]: string } {
    return this._supportedFiatCurrencies;
  }

  getSupportedCountries(): Observable<any> {
    return this.httpClient.get('https://api.sendwyre.com/v3/widget/supportedCountries');
  }
}

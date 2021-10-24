import {Component, OnInit} from '@angular/core';
import {AccountService} from '../account.service';
import {BackendAPIService} from '../backend-api.service';
import {CryptoService} from '../crypto.service';
import {GlobalVarsService} from '../global-vars.service';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';
import {HttpParams} from '@angular/common/http';

@Component({
  selector: 'app-shared-secret',
  templateUrl: './shared-secret.component.html',
  styleUrls: ['./shared-secret.component.scss']
})
export class SharedSecretComponent implements OnInit {

  ownerPublicKeyBase58Check = '';
  derivedPublicKeyBase58Check = '';
  messagePublicKeys: string[] = [];
  errorMsg = '';

  constructor(
    private accountService: AccountService,
    private backendApi: BackendAPIService,
    private cryptoService: CryptoService,
    public globalVars: GlobalVarsService,
  ) { }

  ngOnInit(): void {
    if (!this.globalVars.callback){
      this.errorMsg = 'Callback required';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('ownerPublicKey')){
      this.ownerPublicKeyBase58Check = params.get('ownerPublicKey') as string;
      if ( !this.accountService.getPublicKeys().includes(this.ownerPublicKeyBase58Check) ){
        this.errorMsg = 'Owner Public Key not present in browser data';
        return;
      }
    } else {
      this.errorMsg = 'Owner Public Key required';
      console.error(this.errorMsg);
      return;
    }

    if (params.get('derivedPublicKey')){
      this.derivedPublicKeyBase58Check = params.get('derivedPublicKey') as string;
    } else {
      this.errorMsg = 'Derived Public Key required';
      console.error(this.errorMsg);
      return;
    }

    if (params.get('JWT')){
      const JWT = params.get('JWT') as string;
      try {
        const derivedPublicKey = this.cryptoService.publicKeyToECBuffer(this.derivedPublicKeyBase58Check).toString('hex');
        const keyEncoder = new KeyEncoder('secp256k1');
        const encodedPublicKey = keyEncoder.encodePublic(derivedPublicKey, 'raw', 'pem');
        const decoded = jsonwebtoken.verify(JWT, encodedPublicKey, {algorithms: ['ES256']});
      } catch (e) {
        console.error(e);
        this.errorMsg = 'Failed to verify JWT';
        return;
      }
    } else {
      this.errorMsg = 'Derived Public Key required';
      console.error(this.errorMsg);
      return;
    }

    if (params.get('messagePublicKeys')){
      try {
        this.messagePublicKeys = (params.get('messagePublicKeys') as string).split(',');
        for (const messageKey of this.messagePublicKeys) {
          const publicKeyBytes = this.cryptoService.publicKeyToECBuffer(messageKey);
        }
      } catch (e) {
        console.error(e);
        this.errorMsg = 'Failed to parse Message Public Keys';
        return;
      }
    } else {
      this.errorMsg = 'Message Public Keys required';
      console.error(this.errorMsg);
      return;
    }

    this.backendApi.GetUserDerivedKeys(this.ownerPublicKeyBase58Check).subscribe( keys => {
      if (this.derivedPublicKeyBase58Check in keys) {
        this.backendApi.GetAppState().subscribe( state => {
          const blockHeight = state.BlockHeight;
          const key = keys[this.derivedPublicKeyBase58Check];
          if (!key) {
            this.errorMsg = 'This should never happen but if it does, DH was right.';
            return;
          }
          if (blockHeight < key.expirationBlock && key.isValid) {
            const sharedSecrets: string[] = [];
            for (const messageKey of this.messagePublicKeys){
              const sharedSecret = this.accountService.getPrivateSharedSecret(this.ownerPublicKeyBase58Check, messageKey);
              if (sharedSecret === ''){
                this.errorMsg = 'Failed to calculate shared secrets';
                return;
              }
              sharedSecrets.push(sharedSecret);
            }

            let httpParams = new HttpParams();
            httpParams = httpParams.append('sharedSecrets', sharedSecrets.toString());
            window.location.href = this.globalVars.callback + `?${httpParams.toString()}`;
          }
        });
      }
    });
  }

}

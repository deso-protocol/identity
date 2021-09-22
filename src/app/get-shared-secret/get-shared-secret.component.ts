import { Component, OnInit } from '@angular/core';
import {CryptoService} from '../crypto.service';
import KeyEncoder from 'key-encoder';
import * as jsonwebtoken from 'jsonwebtoken';


@Component({
  selector: 'app-get-shared-secret',
  templateUrl: './get-shared-secret.component.html',
  styleUrls: ['./get-shared-secret.component.scss']
})
export class GetSharedSecretComponent implements OnInit {

  ownerPublicKeyBase58Check = '';
  derivedPublicKeyBase58Check = '';
  JWT = '';
  messagePublicKeys: string[] = [];

  constructor(
    private cryptoService: CryptoService,
  ) {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ownerPublicKey')){
      this.ownerPublicKeyBase58Check = params.get('ownerPublicKey') as string;
      console.log("ownerPublicKeyBase58Check", this.ownerPublicKeyBase58Check);
    }
    if (params.get('derivedPublicKey')){
      this.derivedPublicKeyBase58Check = params.get('derivedPublicKey') as string;
      console.log("derivedPublicKeyBase58Check", this.derivedPublicKeyBase58Check);
    }
    if (params.get('JWT')){
      this.JWT = params.get('JWT') as string;
      const derivedPublicKey = cryptoService.publicKeyToECBuffer(this.derivedPublicKeyBase58Check);
      const keyEncoder = new KeyEncoder('secp256k1');
      const encodedPublicKey = keyEncoder.encodePublic(derivedPublicKey, 'raw', 'pem');
      const decoded = jsonwebtoken.verify(this.JWT, encodedPublicKey, {algorithms: ['ES256']});
      console.log("decoded", decoded, "JWT", this.JWT);
    }
    if (params.get('messagePublicKeys')){
      this.messagePublicKeys = (params.get('messagePublicKeys') as string).split(',');
      console.log("messagePublicKeys", this.messagePublicKeys);
    }
  }

  ngOnInit(): void {

  }

}

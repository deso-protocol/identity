import { Component, OnInit } from '@angular/core';
import {AccountService} from '../account.service';
import {IdentityService} from '../identity.service';
import {BackendAPIService} from '../backend-api.service';
import {GlobalVarsService} from '../global-vars.service';
import {GoogleDriveService} from '../google-drive.service';
import {UserProfile} from '../../types/identity';
import {ActivatedRoute, Router} from '@angular/router';
import {CryptoService} from '../crypto.service';
import {SigningService} from '../signing.service';
import {Observable} from 'rxjs';

export enum MESSAGING_GROUP_OPERATION {
  DEFAULT_KEY = 'DefaultKey',
  CREATE_GROUP = 'CreateGroup',
  ADD_MEMBERS = 'AddMembers',
}

@Component({
  selector: 'app-messaging-group',
  templateUrl: './messaging-group.component.html',
  styleUrls: ['./messaging-group.component.scss']
})
export class MessagingGroupComponent implements OnInit {

  error: any = '';
  allUsers: {[key: string]: UserProfile} = {};
  hasUsers = false;

  operation: MESSAGING_GROUP_OPERATION = MESSAGING_GROUP_OPERATION.DEFAULT_KEY;
  applicationMessagingPublicKeyBase58Check = '';
  updatedGroupOwnerUsername = '';
  updatedGroupOwnerPublicKeyBase58Check = '';
  updatedGroupKeyName = '';
  updatedMembersPublicKeysBase58Check: string[] = [];
  updatedMembersKeyNames: string[] = [];
  updatedMembersProfiles = {} as Observable<{[publicKeyBase58Check: string]: UserProfile}>;
  MESSAGING_GROUP_OPERATION = MESSAGING_GROUP_OPERATION;

  constructor(
    private accountService: AccountService,
    private identityService: IdentityService,
    public globalVars: GlobalVarsService,
    private googleDrive: GoogleDriveService,
    private backendApi: BackendAPIService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private cryptoService: CryptoService,
    private signingService: SigningService,
  ) { }

  ngOnInit(): void {
    try {
      this.initializeMessagingGroupComponent();
      this.backendApi.GetUserProfiles([this.updatedGroupOwnerPublicKeyBase58Check]).toPromise()
        .then(profiles => {
          this.updatedGroupOwnerUsername = profiles[this.updatedGroupOwnerPublicKeyBase58Check].username;
        })
        .catch(e => {
          this.error = e;
        });
    } catch (e) {
      this.error = e;
    }
  }

  initializeMessagingGroupComponent(): void {
    // Load profile pictures and usernames
    const publicKeys = this.accountService.getPublicKeys();
    this.hasUsers = publicKeys.length > 0;
    this.backendApi.GetUserProfiles(publicKeys)
      .subscribe(profiles => {
        this.allUsers = profiles;
      });

    this.activatedRoute.queryParams.subscribe(params => {
      try {
        this.processURLParams(params);
      } catch (e) {
        this.error = e;
      }
    });
  }

  processURLParams(params: any): void {
    // Get the intended group chat operation.
    if (params.operation) {
      this.operation = params.operation;
      let operationExists = false;
      for (const op of Object.values(MESSAGING_GROUP_OPERATION)) {
        if (op === params.operation) {
          operationExists = true;
          this.operation = op;
          break;
        }
      }
      if (!operationExists) {
        throw new Error(`Invalid operation ${params.operation}`);
      }
    }
    // Get the application public key from the query params.
    if (params.applicationMessagingPublicKeyBase58Check) {
      // We call publicKeyToBuffer just to make sure the public key is valid. If it's not, we'll throw an error.
      this.cryptoService.publicKeyToBuffer(params.applicationMessagingPublicKeyBase58Check);
      this.applicationMessagingPublicKeyBase58Check = params.applicationMessagingPublicKeyBase58Check;
    }
    // Get the group chat owner public key.
    if (params.updatedGroupOwnerPublicKeyBase58Check) {
      // We call publicKeyToBuffer just to make sure the public key is valid. If it's not, we'll throw an error.
      this.cryptoService.publicKeyToBuffer(params.updatedGroupOwnerPublicKeyBase58Check);
      let userExists = false;
      for (const pk of this.accountService.getPublicKeys()) {
        if (pk === params.updatedGroupOwnerPublicKeyBase58Check) {
          userExists = true;
          break;
        }
      }
      if (!userExists) {
        throw new Error('Invalid group chat owner, doesn\'t exist in the signed-in user\'s account');
      }
      this.updatedGroupOwnerPublicKeyBase58Check = params.updatedGroupOwnerPublicKeyBase58Check;
    }
    // Get the group chat name.
    if (params.updatedGroupKeyName) {
      if (!this.validateMessagingGroupKeyName(params.updatedGroupKeyName)) {
        throw new Error('Group name is too long');
      }
      this.updatedGroupKeyName = params.updatedGroupKeyName;
    }
    // Get the group chat members.
    if (params.updatedMembersPublicKeysBase58Check) {
      this.updatedMembersPublicKeysBase58Check = params.updatedMembersPublicKeysBase58Check.split(',');
      for (const pk of this.updatedMembersPublicKeysBase58Check) {
        // We call publicKeyToBuffer just to make sure the public key is valid. If it's not, we'll throw an error.
        this.cryptoService.publicKeyToBuffer(pk);
      }
    }
    // Get the group chat members' key names.
    if (params.updatedMembersKeyNames) {
      this.updatedMembersKeyNames = params.updatedMembersKeyNames.split(',');
      for (const keyName of this.updatedMembersKeyNames) {
        if (!this.validateMessagingGroupKeyName(keyName)) {
          throw new Error('Member key name is too long');
        }
      }
    }
    if (!this.validateMessagingGroupOperation()) {
      throw new Error('Invalid messaging group operation');
    }

    if (this.operation === MESSAGING_GROUP_OPERATION.ADD_MEMBERS) {
      this.updatedMembersProfiles = this.backendApi.GetUserProfiles(this.updatedMembersPublicKeysBase58Check);
    }
  }

  validateMessagingGroupKeyName(keyName: string): boolean{
    return keyName.length <= this.globalVars.messagingGroupNameMaxLength;
  }

  validateMessagingGroupOperation(): boolean {
    const groupSet = this.updatedGroupOwnerPublicKeyBase58Check !== '' && this.updatedGroupKeyName !== '';
    const applicationSet = this.applicationMessagingPublicKeyBase58Check !== '';
    const membersSetEmpty = this.updatedMembersPublicKeysBase58Check.length === 0 && this.updatedMembersKeyNames.length === 0;
    const membersSetNonEmpty = this.updatedMembersPublicKeysBase58Check.length > 0 &&
      this.updatedMembersPublicKeysBase58Check.length === this.updatedMembersKeyNames.length;

    let validityCondition = groupSet;
    switch (this.operation) {
      case MESSAGING_GROUP_OPERATION.DEFAULT_KEY:
        // In this operation, we need to set the group to be the default key. We also optionally set the application
        // key, and the members of the group need to be set to empty.
        if (this.updatedGroupKeyName !== this.globalVars.defaultMessageKeyName) {
          return false;
        }
        validityCondition &&= membersSetEmpty;
        break;
      case MESSAGING_GROUP_OPERATION.CREATE_GROUP:
        // This operation is identical to the default key operation, except that here the group key cannot be equal
        // to the default key. We distinguish between the default-key and non-default-key operation for the ease of API.
        // This way, don't have to send the messaging group signature in the generic CREATE_GROUP operation, which is
        // required in the DEFAULT_KEY case in order to authorize a default-key.
        if (this.updatedGroupKeyName === this.globalVars.defaultMessageKeyName) {
          return false;
        }
        validityCondition &&= membersSetEmpty;
        break;
      case MESSAGING_GROUP_OPERATION.ADD_MEMBERS:
        // In this operation, we need to add members to the group. The group must be set, we optionally allow for
        // the application key (an app can add members without requesting private key access to the group), and
        // the members of the group need to be set to non-empty.
        validityCondition &&= membersSetNonEmpty;
        break;
    }

    if (!validityCondition) {
      throw new Error(`Invalid messaging group operation operation: ${this.operation} groupSet: ${groupSet}, applicationSet:
      ${applicationSet}, membersSetEmpty: ${membersSetEmpty}, membersSetNonEmpty: ${membersSetNonEmpty}`);
    }
    return true;
  }

  getOperationString(): string {
    switch (this.operation) {
      case MESSAGING_GROUP_OPERATION.DEFAULT_KEY:
        return 'Default Access';
      case MESSAGING_GROUP_OPERATION.CREATE_GROUP:
        return 'Create Group';
      case MESSAGING_GROUP_OPERATION.ADD_MEMBERS:
        return 'Add Members';
    }
    return this.operation;
  }

  approveOperation(): void {
    this.asyncApproveOperation()
      .catch((err) => {
        this.error = err;
        console.error(err);
      });
  }

  public async asyncApproveOperation(): Promise<void> {
    const {messagingPublicKeyBase58Check, messagingPrivateKeyHex, messagingKeySignature} =
     await this.accountService.getMessagingGroupStandardDerivation(
        this.updatedGroupOwnerPublicKeyBase58Check, this.updatedGroupKeyName);
    let encryptedMessagingKeyRandomness: string | undefined;
    const publicUser = this.accountService.getEncryptedUsers()[this.updatedGroupOwnerPublicKeyBase58Check];
    if (publicUser?.encryptedMessagingKeyRandomness) {
      encryptedMessagingKeyRandomness = publicUser.encryptedMessagingKeyRandomness;
    }
    const encryptedToApplicationGroupMessagingPrivateKey = this.signingService.encryptGroupMessagingPrivateKeyToMember(
      this.applicationMessagingPublicKeyBase58Check, messagingPrivateKeyHex);
    switch (this.operation) {
      case MESSAGING_GROUP_OPERATION.DEFAULT_KEY:
        this.respondToClient(
          messagingKeySignature,
          encryptedToApplicationGroupMessagingPrivateKey,
          [],
          messagingPublicKeyBase58Check,
          encryptedMessagingKeyRandomness
        );
        break;
      case MESSAGING_GROUP_OPERATION.CREATE_GROUP:
        this.respondToClient(
          '',
          encryptedToApplicationGroupMessagingPrivateKey,
          [],
          messagingPublicKeyBase58Check,
          encryptedMessagingKeyRandomness
        );
        break;
      case MESSAGING_GROUP_OPERATION.ADD_MEMBERS:
        try {
          const allPublicKeys = [ this.updatedGroupOwnerPublicKeyBase58Check, ...this.updatedMembersPublicKeysBase58Check];
          const allKeyNames = [ this.updatedGroupKeyName, ...this.updatedMembersKeyNames];
          const resp = await this.backendApi.GetBulkMessagingPublicKeys(allPublicKeys, allKeyNames).toPromise();
          const messagingPublicKeys = resp.MessagingPublicKeysBase58Check;
          const ownerMessagingPublicKey = messagingPublicKeys[0];
          if (ownerMessagingPublicKey !== messagingPublicKeyBase58Check) {
            throw new Error('Error can\'t perform AddMembers operation on a group with non-standard key derivation');
          }
          const memberMessagingPublicKeys = messagingPublicKeys.slice(1);
          const encryptedToMembersGroupMessagingPrivateKey: string[] = [];
          for (const memberMessagingPublicKeyBase58Check of memberMessagingPublicKeys) {
            const encryptedGroupMessagingPriv = this.signingService.encryptGroupMessagingPrivateKeyToMember(
              memberMessagingPublicKeyBase58Check, messagingPrivateKeyHex);
            encryptedToMembersGroupMessagingPrivateKey.push(encryptedGroupMessagingPriv);
          }
          this.respondToClient(
            '',
            encryptedToApplicationGroupMessagingPrivateKey,
            encryptedToMembersGroupMessagingPrivateKey,
            messagingPublicKeyBase58Check,
            encryptedMessagingKeyRandomness,
          );
        } catch (e) {
          throw new Error('Error getting bulk messaging public keys');
        }
        break;
      default:
        throw new Error('Error invalid operation');
    }
  }
  respondToClient(
    messagingKeySignature: string,
    encryptedToApplicationGroupMessagingPrivateKey: string,
    encryptedToMembersGroupMessagingPrivateKey: string[],
    messagingPublicKeyBase58Check: string,
    encryptedMessagingKeyRandomness: string | undefined
  ): void {
    this.identityService.messagingGroup({
      messagingKeySignature,
      encryptedToApplicationGroupMessagingPrivateKey,
      encryptedToMembersGroupMessagingPrivateKey,
      messagingPublicKeyBase58Check,
      encryptedMessagingKeyRandomness,
    });
  }

  onAccountSelect(event: any): void {}
}

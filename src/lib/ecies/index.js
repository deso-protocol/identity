/**
 * Browser ecies-parity implementation.
 *
 * This is based of the eccrypto js module
 *
 * Imported from https://github.com/sigp/ecies-parity with some changes:
 * - Remove PARITY_DEFAULT_HMAC
 * - Use const instead of var/let
 * - Use node:crypto instead of subtle
 */
import {createCipheriv, createDecipheriv, randomBytes, createHmac, createHash} from "crypto";

const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

// The KDF as implemented in Parity
export const kdf = function(secret, outputLength) {
  let ctr = 1;
  let written = 0;
  let result = Buffer.from('');
  while (written < outputLength) {
    const ctrs = Buffer.from([ctr >> 24, ctr >> 16, ctr >> 8, ctr]);
    const hashResult = createHash("sha256").update(Buffer.concat([ctrs, secret])).digest();
    result = Buffer.concat([result, hashResult])
    written += 32;
    ctr +=1;
  }
  return result;
}

// AES-128-CTR is used in the Parity implementation
// Get the AES-128-CTR browser implementation
const aesCtrEncrypt = function(counter, key, data) {
  const cipher = createCipheriv('aes-128-ctr', key, counter);
  const firstChunk = cipher.update(data);
  const secondChunk = cipher.final();
  return Buffer.concat([firstChunk, secondChunk]);
}

const aesCtrDecrypt = function(counter, key, data) {
  const cipher = createDecipheriv('aes-128-ctr', key, counter);
  const firstChunk = cipher.update(data);
  const secondChunk = cipher.final();
  return Buffer.concat([firstChunk, secondChunk]);
}

// Legacy AES-128-CTR without second chunk
const aesCtrEncryptLegacy = function(counter, key, data) {
  const cipher = createCipheriv('aes-128-ctr', key, counter);
  return cipher.update(data).toString();
}

const aesCtrDecryptLegacy = function(counter, key, data) {
  const cipher = createDecipheriv('aes-128-ctr', key, counter);
  return cipher.update(data).toString();
}

function hmacSha256Sign(key, msg) {
  return createHmac('sha256', key).update(msg).digest();
}

// Obtain the public elliptic curve key from a private
export const getPublic = function(privateKey) {
  assert(privateKey.length === 32, "Bad private key");
  return new Buffer(ec.keyFromPrivate(privateKey).getPublic("arr"));
};

// ECDSA
export const sign = function(privateKey, msg) {
  return new Promise(function(resolve) {
    assert(privateKey.length === 32, "Bad private key");
    assert(msg.length > 0, "Message should not be empty");
    assert(msg.length <= 32, "Message is too long");
    resolve(new Buffer(ec.sign(msg, privateKey, {canonical: true}).toDER()));
  });
};

// Verify ECDSA signatures
export const verify = function(publicKey, msg, sig) {
  return new Promise(function(resolve, reject) {
    assert(publicKey.length === 65, "Bad public key");
    assert(publicKey[0] === 4, "Bad public key");
    assert(msg.length > 0, "Message should not be empty");
    assert(msg.length <= 32, "Message is too long");
    if (ec.verify(msg, sig, publicKey)) {
      resolve(null);
    } else {
      reject(new Error("Bad signature"));
    }
  });
};

//ECDH
export const derive = function(privateKeyA, publicKeyB) {
  assert(Buffer.isBuffer(privateKeyA), "Bad input");
  assert(Buffer.isBuffer(publicKeyB), "Bad input");
  assert(privateKeyA.length === 32, "Bad private key");
  assert(publicKeyB.length === 65, "Bad public key");
  assert(publicKeyB[0] === 4, "Bad public key");
  const keyA = ec.keyFromPrivate(privateKeyA);
  const keyB = ec.keyFromPublic(publicKeyB);
  const Px = keyA.derive(keyB.getPublic());  // BN instance
  return new Buffer(Px.toArray());
};


// Encrypt AES-128-CTR and serialise as in Parity
// Serialization: <ephemPubKey><IV><CipherText><HMAC>
export const encrypt = function(publicKeyTo, msg, opts) {
  opts = opts || {};
  const ephemPrivateKey = opts.ephemPrivateKey || randomBytes(32);
  const ephemPublicKey = getPublic(ephemPrivateKey);

  const sharedPx = derive(ephemPrivateKey, publicKeyTo);
  const hash = kdf(sharedPx, 32);
  const iv = opts.iv || randomBytes(16);
  const encryptionKey = hash.slice(0, 16);

  // Generate hmac
  const macKey = createHash("sha256").update(hash.slice(16)).digest();

  let ciphertext;
  if (opts.legacy){
    ciphertext = aesCtrEncryptLegacy(iv, encryptionKey, msg);
  } else {
    ciphertext = aesCtrEncrypt(iv, encryptionKey, msg);
  }
  const dataToMac = Buffer.from([...iv, ...ciphertext]);
  const HMAC = hmacSha256Sign(macKey, dataToMac);

  return Buffer.from([...ephemPublicKey, ...iv, ...ciphertext, ...HMAC]);
};

// Decrypt serialised AES-128-CTR
export const decrypt = function(privateKey, encrypted, opts) {
  opts = opts || {};
  const metaLength = 1 + 64 + 16 + 32;
  assert(encrypted.length > metaLength, "Invalid Ciphertext. Data is too small")
  assert(encrypted[0] >= 2 && encrypted[0] <= 4, "Not valid ciphertext.")

  // deserialize
  const ephemPublicKey = encrypted.slice(0, 65);
  const cipherTextLength = encrypted.length - metaLength;
  const iv = encrypted.slice(65, 65 + 16);
  const cipherAndIv = encrypted.slice(65, 65 + 16 + cipherTextLength);
  const ciphertext = cipherAndIv.slice(16);
  const msgMac = encrypted.slice(65 + 16 + cipherTextLength);

  // check HMAC
  const px = derive(privateKey, ephemPublicKey);
  const hash = kdf(px,32);
  const encryptionKey = hash.slice(0, 16);
  const macKey = createHash("sha256").update(hash.slice(16)).digest()
  const dataToMac = Buffer.from(cipherAndIv);
  const hmacGood = hmacSha256Sign(macKey, dataToMac);
  assert(hmacGood.equals(msgMac), "Incorrect MAC");

  // decrypt message
  if (opts.legacy){
    return aesCtrDecryptLegacy(iv, encryptionKey, ciphertext);
  } else {
    return aesCtrDecrypt(iv, encryptionKey, ciphertext);
  }
};

// Encrypt AES-128-CTR and serialise as in Parity
// Using ECDH shared secret KDF
// Serialization: <ephemPubKey><IV><CipherText><HMAC>
export const encryptShared = function(privateKeySender, publicKeyRecipient, msg, opts){
  opts = opts || {};
  const sharedPx = derive(privateKeySender, publicKeyRecipient)
  const sharedPrivateKey = kdf(sharedPx, 32);
  const sharedPublicKey = getPublic(sharedPrivateKey);

  opts.legacy = false;
  return encrypt(sharedPublicKey, msg, opts);
}

// Decrypt serialised AES-128-CTR
// Using ECDH shared secret KDF
export const decryptShared = function(privateKeyRecipient, publicKeySender, encrypted, opts) {
  opts = opts || {};
  const sharedPx = derive(privateKeyRecipient, publicKeySender);
  const sharedPrivateKey = kdf(sharedPx, 32);

  opts.legacy = false;
  return decrypt(sharedPrivateKey, encrypted, opts);
}

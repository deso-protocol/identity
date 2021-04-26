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
export const kdf = async function(secret, outputLength) {
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
  const cipher = createCipheriv('aes-256-gcm', key, counter);
  return cipher.update(data).toString();
}

const aesCtrDecrypt = function(counter, key, data) {
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
  return new Promise(function(resolve) {
    assert(Buffer.isBuffer(privateKeyA), "Bad input");
    assert(Buffer.isBuffer(publicKeyB), "Bad input");
    assert(privateKeyA.length === 32, "Bad private key");
    assert(publicKeyB.length === 65, "Bad public key");
    assert(publicKeyB[0] === 4, "Bad public key");
    const keyA = ec.keyFromPrivate(privateKeyA);
    const keyB = ec.keyFromPublic(publicKeyB);
    const Px = keyA.derive(keyB.getPublic());  // BN instance
    resolve(new Buffer(Px.toArray()));
  });
};


// Encrypt AES-128-CTR and serialise as in Parity
// Serialisation: <ephemPubKey><IV><CipherText><HMAC>
export const encrypt = async function(publicKeyTo, msg, opts) {
  opts = opts || {};
  const ephemPrivateKey = opts.ephemPrivateKey || randomBytes(32);
  const ephemPublicKey = getPublic(ephemPrivateKey);
  const sharedPx = await derive(ephemPrivateKey, publicKeyTo);
  const hash = await kdf(sharedPx, 32);
  const iv = opts.iv || randomBytes(16);
  const encryptionKey = hash.slice(0, 16);
  const macKey = await sha256(hash.slice(16));
  const ciphertext = await aesCtrEncrypt(iv, encryptionKey, msg);
  const dataToMac = Buffer.concat([iv, ciphertext]);
  const HMAC = await hmacSha256Sign(macKey, dataToMac);
  return Buffer.concat([ephemPublicKey,iv,ciphertext,HMAC]);
};

// Decrypt serialised AES-128-CTR
export const decrypt = async function(privateKey, encrypted) {
  const metaLength = 1 + 64 + 16 + 32;
  assert(encrypted.length > metaLength, "Invalid Ciphertext. Data is too small")
  assert(encrypted[0] >= 2 && encrypted[0] <= 4, "Not valid ciphertext.")

  // deserialise
  const ephemPublicKey = encrypted.slice(0,65);
  const cipherTextLength = encrypted.length - metaLength;
  const iv = encrypted.slice(65,65 + 16);
  const cipherAndIv = encrypted.slice(65, 65+16+ cipherTextLength);
  const ciphertext = cipherAndIv.slice(16);
  const msgMac = encrypted.slice(65+16+ cipherTextLength);

  // check HMAC
  const px = await derive(privateKey, ephemPublicKey);
  const hash = await kdf(px,32);
  const encryptionKey = hash.slice(0, 16);
  const macKey = createHash("sha256").update(hash.slice(16)).digest()
  const dataToMac = Buffer.from(cipherAndIv);
  const hmacGood = await hmacSha256Sign(macKey, dataToMac);
  assert(hmacGood.equals(msgMac), "Incorrect MAC");

  // decrypt message
  const plainText = await aesCtrDecrypt(iv, encryptionKey, ciphertext);
  return plainText;
};

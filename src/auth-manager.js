/*
 * Copyright 2013 Kenny Root
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function(exports) {
  /**
   * Key used for local storage of private key.
   *
   * @const
   * @type {String}
   */
  var RSA_PRIVATE_INDEX = "RSA_key_private";

  /**
   * Key used for local storage of public key.
   *
   * @const
   * @type {String}
   */
  var RSA_PUBLIC_INDEX = "RSA_key_public";

  /**
   * Bit length of RSA modulus to generate.
   *
   * @const
   * @type {Number}
   */
  var RSA_BITS = 2048;

  /**
   * RSA exponent to use as a hex-encoded integer.
   *
   * @const
   * @type {String}
   */
  var RSA_EXPONENT = '010001';
  // RSA_F4 in hex

  /**
   * When signing, we need to stick this in front to encode that it's a SHA-1 signature.
   *
   * @const
   */
  var ASN1_PREAMBLE = [0x00, 0x30, 0x21, 0x30, 0x09, 0x06, 0x05, 0x2B, 0x0E, 0x03, 0x02, 0x1A, 0x05, 0x00, 0x04, 0x14];

  /**
   * Manages the storage and retrieval of the RSA keypair used. Generates the
   * key on demand if needed.
   *
   * @constructor
   * @this {AuthManager}
   */
  function AuthManager() {
    /** @private */
    this.key_private = undefined;
    /** @private */
    this.key_public = undefined;
    /** @private */
    this.storage = chrome.storage.local;
  }

  /**
   * Since we're running as a Chrome app, we have access to the window.crypto
   * API. Use it to seed the RNG.
   */
  function seedRng() {
    var array = new Uint32Array(64);
    window.crypto.getRandomValues(array);

    for (var i = 0; i < array.length; i++) {
      rng_seed_int(array[i]);
    }
  }

  /**
   * Saves the keys currently set.
   *
   * @this {AuthManager}
   */
  AuthManager.prototype._saveKeys = function(callback) {
    var hydrate = new Hydrate(new Hydrate.ContextResolver(exports));
    var dict = {};
    dict[RSA_PRIVATE_INDEX] = hydrate.stringify(this.key_private);
    dict[RSA_PUBLIC_INDEX] = hydrate.stringify(this.key_public);
    this.storage.set(dict, callback);
  };

  /**
   * Loads keys from storage set.
   *
   * @this {AuthManager}
   */
  AuthManager.prototype._loadKeys = function(callback) {
    var hydrate = new Hydrate(new Hydrate.ContextResolver(exports));

    this.storage.get([RSA_PRIVATE_INDEX, RSA_PUBLIC_INDEX], function(values) {
      this.key_private = hydrate.parse(values[RSA_PRIVATE_INDEX]);
      this.key_public = hydrate.parse(values[RSA_PUBLIC_INDEX]);
      callback();
    }.bind(this));
  };

  /**
   * Initializes the AuthManager from local storage. Generates new keys if
   * none are available.
   *
   * @this {AuthManager}
   */
  AuthManager.prototype.initialize = function(callback) {
    this._loadKeys(function() {
      if (this.key_private !== undefined) {
        callback();
      } else {
        var key = new RSAKey();

        seedRng();
        key.generate(RSA_BITS, RSA_EXPONENT);

        this.key_private = key;
        this.key_public = this._convertToMinCrypt(key);

        this._saveKeys(callback);
      }
    }.bind(this));
  };

  /**
   * Sets the currently used and stored key to the value.
   *
   * @this {AuthManager}
   * @param {RSAKey} key_private private key to use and store
   * @private
   */
  AuthManager.prototype._setKey = function(key_private, callback) {
    if (key_private.constructor !== RSAKey) {
      throw "first arg is not an RSAKey";
    }

    this.key_private = key_private;
    this.key_public = this._convertToMinCrypt(key_private);

    this._saveKeys(callback);
  };

  /**
   * Converts the RSAKey to the format expected by mincrypt.
   *
   * @this {AuthManager}
   * @param {RSAKey} rsaKey instance to convert to the mincrypt public format.
   * @returns {String} Base64 encoded public key and host identifier
   * @private
   */
  AuthManager.prototype._convertToMinCrypt = function(rsaKey) {
    var numWords = rsaKey.n.bitLength() / 32;

    // B32 = 1 << 32 or 0x100000000L
    var B32 = BigInteger.ONE.shiftLeft(32);

    // modulus
    var N = rsaKey.n.clone();

    // R=2^2048
    var R = BigInteger.ONE.shiftLeft(1).pow(rsaKey.n.bitLength());

    // RR = R^2 % N
    var RR = R.multiply(R).mod(N);

    // Format:
    //   int32 len
    //   uint32 n0inv
    //   uint32 n[numWords]
    //   uint32 rr[numWords]
    //   int32 exponent
    var pkey = new Uint32Array(3 + numWords * 2);
    pkey[0] = numWords;
    pkey[1] = B32.subtract(N.modInverse(B32)).intValue();

    var iEnd = numWords + 2;
    for (var i = 2, j = 2 + numWords; i < iEnd; ++i, ++j) {
      pkey[i] = N.mod(B32).intValue();
      N = N.divide(B32);
      pkey[j] = RR.mod(B32).intValue();
      RR = RR.divide(B32);
    }

    pkey[pkey.length - 1] = rsaKey.e;

    // Convert to hex string first since our Base64 only does that
    var hexStr = "";
    var u8view = new Uint8Array(pkey.buffer);
    for (var i = 0; i < u8view.length; ++i) {
      var digit = u8view[i].toString(16);
      if (digit.length == 1) {
        hexStr += "0";
      }
      hexStr += digit;
    }

    // TODO: allow setting a useful identifier
    return hex2b64(hexStr) + " adb@chrome";
  };

  /**
   * Clears out the current keys from memory and storage.
   *
   * @this {AuthManager}
   */
  AuthManager.prototype.clearKeys = function(callback) {
    this.key_private = null;
    this.key_public = null;

    this.storage.remove([RSA_PRIVATE_INDEX, RSA_PUBLIC_INDEX], callback);
  };

  /**
   * Do a raw signature of the data.
   *
   * The format before signature:
   * 0x00 0x01 0xFF [...] 0xFF 0x00 [ASN.1 preamble] [data]
   *
   * @exception
   * @this {AuthManager}
   * @returns {ArrayBuffer} signed data
   */
  AuthManager.prototype.sign = function(data) {
    if (this.key_private == null) {
      throw "AuthManager is not initialized";
    }

    var totalLen = this.key_private.n.bitLength() / 8;

    var array = new Uint8Array(totalLen);
    array[0] = 0x00;
    array[1] = 0x01;

    // Subtract the preamble and hash length.
    var padEnd = totalLen - ASN1_PREAMBLE.length - data.byteLength;
    for (var i = 2; i < padEnd; i++) {
      array[i] = 0xFF;
    }

    array.set(new Uint8Array(ASN1_PREAMBLE), padEnd);
    padEnd += ASN1_PREAMBLE.length;
    array.set(new Uint8Array(data), padEnd);

    var msg = new BigInteger(Array.apply([], array));
    return new Uint8Array(this.key_private.doPrivate(msg).toByteArray()).buffer;
  };

  exports.AuthManager = AuthManager;
} )(window); 
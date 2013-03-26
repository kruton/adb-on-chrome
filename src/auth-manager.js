/*
 * @author Kenny Root
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
   * Manages the storage and retrieval of the RSA keypair used. Generates the
   * key on demand if needed.
   *
   * @constructor
   * @this {AuthManager}
   */
  function AuthManager() {
    /** @private */
    this.key_private = null;
    /** @private */
    this.key_public = null;
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
   * Initializes the AuthManager from local storage. Generates new keys if
   * none are available.
   *
   * @this {AuthManager}
   */
  AuthManager.prototype.initialize = function() {
    this.key_private = localStorage.getObject(RSA_PRIVATE_INDEX);
    this.key_public = localStorage.getObject(RSA_PUBLIC_INDEX);

    if (this.key_private == null) {
      var key = new RSAKey();

      seedRng();
      key.generate(RSA_BITS, RSA_EXPONENT);

      this.key_private = key;
      this.key_public = this._convertToMinCrypt(key);

      localStorage.setObject(RSA_PRIVATE_INDEX, this.key_private);
      localStorage.setObject(RSA_PUBLIC_INDEX, this.key_public);
    }
  };

  /**
   * Sets the currently used and stored key to the value.
   *
   * @this {AuthManager}
   * @param {RSAKey} key_private private key to use and store
   * @private
   */
  AuthManager.prototype._setKey = function(key_private) {
    if (key_private.constructor !== RSAKey) {
      throw "first arg is not an RSAKey";
    }

    this.key_private = key_private;
    this.key_public = this._convertToMinCrypt(key_private);

    localStorage.setObject(RSA_PRIVATE_INDEX, this.key_private);
    localStorage.setObject(RSA_PUBLIC_INDEX, this.key_public);
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
  AuthManager.prototype.clearKeys = function() {
    this.key_private = null;
    this.key_public = null;

    localStorage.removeItem(RSA_PRIVATE_INDEX);
    localStorage.removeItem(RSA_PUBLIC_INDEX);
  };

  /**
   * Do a raw signature of the data.
   *
   * The format before signature:
   * 0x00 0x01 0xFF [...] 0xFF 0x00 [data]
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

    // Subtract the 0x00 separator.
    var padEnd = totalLen - data.byteLength - 1;
    for (var i = 2; i < padEnd; i++) {
      array[i] = 0xFF;
    }

    array[padEnd++] = 0x00;
    array.set(new Uint8Array(data), padEnd);

    var msg = new BigInteger(Array.apply([], array));
    return new Uint8Array(this.key_private.doPrivate(msg).toByteArray()).buffer;
  };

  Storage.prototype.setObject = function(key, value) {
    var hydrate = new Hydrate(new Hydrate.ContextResolver(exports));

    this.setItem(key, hydrate.stringify(value));
  };

  Storage.prototype.getObject = function(key) {
    var hydrate = new Hydrate(new Hydrate.ContextResolver(exports));

    var value = this.getItem(key);
    return value && hydrate.parse(value);
  };

  exports.AuthManager = AuthManager;
} )(window); 
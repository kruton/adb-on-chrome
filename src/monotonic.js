/*
 * @author Kenny Root
 */

(function(exports) {
  /**
   * A monotonic counter.
   *
   * @returns {Monotonic}
   * @type {Object}
   * @constructor
   */
  function Monotonic() {
    if (Monotonic.prototype._singletonInstance) {
      return Monotonic.prototype._singletonInstance;
    }

    /**
     * @private
     * @type {Monotonic}
     */
    Monotonic.prototype._singletonInstance = this;

    /**
     * @private
     * @type {Number}
     */
    this.counter = 1;
  }

  /**
   * Returns the next item in the counter.
   *
   * @this {Monotonic}
   * @return {Number} next monotonic number
   */
  Monotonic.prototype.next = function() {
    var num = this.counter++;
    if (this.counter > 0xFFFFFFFF) {
      this.counter = 1;
    }
    return num;
  };

  /**
   * Sets the counter for testing. Visible for testing.
   *
   * @this {Monotonic}
   * @param {Number} counter the value to set the counter to
   */
  Monotonic.prototype.setCounter = function(counter) {
    this.counter = counter;
  };

  exports.Monotonic = Monotonic;
} )(window); 
/*
 * @author Kenny Root
 */

(function(exports) {
  /**
   * A monotonic counter.
   *
   * @constructor
   */
  function Monotonic() {
    if (Monotonic.prototype._singletonInstance) {
      return Monotonic.prototype._singletonInstance;
    }
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
   * @return {number} next monotonic number
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
   */
  Monotonic.prototype.setCounter = function(counter) {
    this.counter = counter;
  };

  exports.Monotonic = Monotonic;
} )(window); 
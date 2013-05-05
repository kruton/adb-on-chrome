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
})(window);
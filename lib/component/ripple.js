'use strict';

import Component from '../component';
import animate from 'morpheus';

/**
 * Module fieldset
 * @module component/
 */

module.exports = {
  /**
   * _showRipple methosd
   * @param  {string} ripple
   * @param  {string} x
   * @param  {string} y
   * @param  {Object} coord
   * @return {void}
   */
  _showRipple(e) {
    if (!this.size) {
      this.size = this.offset();
    }

    if (!this.ripple) {
      this.ripple = new Component({
        tag: 'span.ui-ripple'
      }).insert(this, 'top');
    }

    var rippleCoord = this._rippleCoord(this.size);
    var options = this.options.ripple;

    var startLeft = (e.offsetX || this.size.width / 2);
    var startTop = (e.offsetY || this.size.height / 2);

    this.ripple.style({
      left: startLeft + 'px',
      top: startTop + 'px',
      width: '5px',
      height: '5px',
      opacity: 1
    });

    this.rippleActive = true;

    // stop animation if exists
    if (this.animation) { this.animation.stop(); }

    this.animation = animate(this.ripple.element, {
      width: rippleCoord.size,
      height: rippleCoord.size,
      left: rippleCoord.left,
      top: rippleCoord.top,
      opacity: 0.2,
      duration: options.duration,
      easing: options.equation,
      complete: () => {
        this.rippleActive = false;
        if (!this.hasClass('is-active'))
          this._hideRipple();
      }
    });
  },

  /**
   * [_hideRipple description]
   */
  _hideRipple() {
    if (!this.ripple || this.rippleActive) {
      return;
    }

    if (this.animation) {
      this.animation.stop();
    }

    this.animation = animate(this.ripple.element, {
      opacity: 0,
      duration: '200',
      easing: this.options.equation,
      complete: () => {
        if (this.ripple) {
          this.ripple.destroy();
          this.ripple = null;
        }
      }
    });
  },

  /**
   * Get ripple final coordiantes
   * @return {Object} Size and top
   */
  _rippleCoord(offset) {
    var size = offset.width;
    var top = -offset.height / 2;

    if (offset.width > offset.height) {
      size = offset.width;
      top = -(offset.width - offset.height / 2);
    } else if (offset.width < offset.height) {
      size = offset.height;
      top = (offset.width - offset.height) / 2;
    }

    return {
      size: size * 2,
      top: top,
      left: size / -2
    };
  }
};

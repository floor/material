import css from '../module/css';

var control = {

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle() {
    if (this.disabled) return;

    if (this.checked) {
      this.check(false);
    } else {
      this.check(true);
    }

    return this;
  },

  /**
   * Set checkbox value
   * @param {boolean} value [description]
   */
  check(checked) {
    if (checked) {
      css.add(this.wrapper, 'is-checked');
      this.element.input.checked = true;
      this.checked = true;
      this.emit('change', this.checked);
    } else {
      css.remove(this.wrapper, 'is-checked');
      this.element.input.checked = false;
      this.checked = false;
      this.emit('change', this.checked);
    }
    return this;
  },

  disable() {
    this.disabled = true;
    this.element.input.setAttribute('disabled', 'disabled');
    css.add(this.wrapper, 'is-disabled');
    return this;
  },

  enable() {
    this.disabled = false;
    this.element.input.removeAttribute('disabled');
    css.remove(this.wrapper, 'is-disabled');
    return this;
  },

  /**
   * [_onInputFocus description]
   * @return {?} [description]
   */
  focus() {
    if (this.disabled) return this;
    css.add(this.wrapper, 'is-focused');
    if (this.element.input !== document.activeElement)
      this.element.input.focus();
    return this;
  },

  /**
   * [_onInputBlur description]
   * @return {?} [description]
   */
  blur() {
    css.remove(this.wrapper, 'is-focused');
    return this;
  }
};

export default control;
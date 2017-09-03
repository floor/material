import css from '../module/css';

var control = {
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
      return this;
    } else {
      css.remove(this.wrapper, 'is-checked');
      this.element.input.checked = false;
      this.checked = false;
      this.emit('change', this.checked);
    }
  },

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
  }
};

export default control;
/**
 * display container class
 */
export default {

  /**
   * [_initDisplay description]
   * @return {Object} The class instance
   */
  _initDisplay() {
    this._modifier = 'width';

    var direction = '';

    //var direction = this.container.wrapper.style('flex-direction');

    if (direction === 'column')
      this._modifier = 'height';

    var modifier = this._modifier;

    if (!this[modifier])
      this[modifier] = 220;

    this.device = this.device || 'desktop';
    //this.underlay.hide();
    this.display = {};

    return this.display;
  },

  /**
   * [getDisplay description]
   * @return {Object} The class instance
   */
  getDisplay() {

    return this._display;
  },

  /**
   * [getDisplay description]
   * @return {Object} The class instance
   */
  setDisplay(display) {

    this._display = display;

    return this;
  },

  /**
   * [toggle description]
   * @return {Object} The class instance
   */
  toggle() {
    //console.log('toggle');
    if (this._display === 'normalized') {
      this.minimize();
    } else {
      this.normalize();
    }

    return this._display;
  },

  /**
   * [minimize description]
   * @return {Object} The class instance
   */
  minimize() {
    //console.log('minimize');
    if (!this.display) {
      this._initDisplay();
    }

    this.emit('minimize');

    this.wrapper.style[this._modifier] = 0;

    this._display = 'minimized';

    this.emit('display', 'minimized');

    return this;
  },

  /**
   * [normalize description]
   * @return {Object} The class instance
   */
  normalize() {
    //console.log('normalize');
    if (!this.display) {
      this._initDisplay();
    }

    this.emit('normalize');

    var size = this[this._modifier];

    this.wrapper.style[this._modifier] = size + 'px';

    this._display = 'normalized';
    this.emit('display', this._display);

    return this;
  },

  /**
   * [normalize description]
   * @return {Object} The class instance
   */
  maximize() {

    this.style('display', null);
    this.addClass('state-focus');

    this._display = 'normalized';

    this.emit('display', this._display);

    return this;
  }
};
import create from './mixin/create'
import insert from './mixin/insert'

const defaults = {
  prefix: 'material',
  class: 'divider',
  tag: 'span'
}

/**
 * this class component represent an divider usually in a list
 *
 * @class
 * @extends {Component}
 * @return {Object} The class instance
 * @example new Item(object);
 */
class Divider {
  static uid = "material-divider";

  /**
   * init
   * @return {Object} The class options
   */
  constructor (options) {
    this.init(options)
    this.build()

    return this
  }

  /**
   * [init description]
   * @param  {?} options [description]
   * @return {?}         [description]
   */
  init (options) {
    this.options = Object.assign({}, defaults, options || {})

    Object.assign(this, insert)
  }

  /**
   * Build function for item
   * @return {Object} This class instance
   */
  build () {
    this.element = create(this.options)

    if (this.options.text) {
      this.element.textContent = this.options.text
    }

    if (this.options.container) {
      this.insert(this.options.container)
    }
  }
}

export default Divider

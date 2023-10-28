'use strict'

const defaults = {
  prefix: 'material',
  class: 'email'
}

/**
 * Base class for all ui components
 * @class
 * @param {Object} options - The component options
 * @return {Object} The class Instance
 */

/**
 * Class representing a UI Container. Can add components.
 *
 * @extends Component
 * @return {parent} The class instance
 * @example new Container({
 *   container: document.body
 * });
 */
class EmailLink {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    this.build()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = document.createElement('a')
    this.element.classList.add('email')

    if (this.options.container) {
      this.options.container.appendChild(this.element)
    }

    return this
  }

  set (email) {
    this.element.innerHTML = email
    this.element.setAttribute('href', 'mailto:' + email)
  }
}

export default EmailLink

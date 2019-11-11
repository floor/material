'use strict'

import emitter from '../module/emitter'

const defaults = {
  class: 'upload'
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
class Upload {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter)

    this.build()
    this.attach()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.root = document.createElement('div')
    this.root.classList.add('upload')

    if (this.options.class !== 'upload') {
      this.root.classList.add(this.options.class)
    }

    this.label = document.createElement('label')
    this.label.innerHTML = this.options.name

    this.root.appendChild(this.label)

    this.input = document.createElement('input')
    this.input.setAttribute('type', 'file')

    if (this.options.accept) {
      this.input.setAttribute('accept', this.options.accept)
    }

    if (this.options.name) {
      this.input.setAttribute('name', this.options.name)
    }

    if (this.options.required) {
      this.input.setAttribute('required', 'required')
    }

    if (this.options.autocomplete) {
      this.input.setAttribute('autocomplete', this.options.autocomplete)
    }

    if (this.options.focus) {
      this.input.focus()
    }

    this.root.appendChild(this.input)

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }

    return this
  }

  attach () {
    this.input.addEventListener('change', (e) => {
      this.emit('change', e)
    })

    this.input.addEventListener('focus', (e) => {
      this.root.classList.add('is-focused')
      this.emit('focus', e)
    })

    this.input.addEventListener('blur', (e) => {
      this.root.classList.remove('is-focused')
      this.emit('blur', e)
    })
  }

  reset () {
    // console.log('reset')
    this.input.value = ''
  }

  set (image) {
    console.log('set', image)
  }
}

export default Upload

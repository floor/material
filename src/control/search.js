// search control

import emitter from '../module/emitter'
import Button from '../control/button'
import cancel from '../skin/material/icon/cancel.svg'

const defaults = {
  class: 'search-input',
  minChar: 4,
  iconCancel: cancel,
  timeout: 200
}

/**
 * Class representing a search input
 *
 * @return {parent} The class instance
 * @example new Search({
 *   container: document.body
 * });
 */
class Search {
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
    this.root.classList.add('search')

    if (this.options.class !== 'search') {
      this.root.classList.add(this.options.class)
    }

    if (this.options.icon) {
      this.icon = document.createElement('i')
      this.icon.classList.add('icon')
      this.icon.innerHTML = this.options.icon
      this.root.appendChild(this.icon)
    }

    this.input = document.createElement('input')
    this.input.classList.add('input')
    this.root.appendChild(this.input)

    this.cancel = new Button({
      container: this.root,
      class: 'clear',
      icon: this.options.iconCancel
    })

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }

    return this
  }

  attach () {
    this.input.addEventListener('input', () => {
      if (this.input.value.length < this.options.minChar) return

      clearTimeout(this.timeout)

      this.timeout = setTimeout(() => {
        this.emit('change', this.input.value)
      }, this.options.timeout)
    })

    this.cancel.on('click', () => {
      this.input.value = ''
      this.input.focus()
      this.emit('cancel')
    })
  }

  set (email) {
    this.root.innerHTML = email
    this.root.setAttribute('href', 'mailto:' + email)
  }
}

export default Search

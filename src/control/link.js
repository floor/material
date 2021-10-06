'use strict'

const defaults = {
  class: 'link',
  tag: 'a'
}

class Link {
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
    this.root = document.createElement(this.options.tag)
    this.root.classList.add(this.options.class)

    if (this.options.class !== 'link') {
      this.root.classList.add('link')
    }

    if (this.options.link) {
      this.set(this.options.link)
    }

    if (this.options.target) {
      this.root.target = this.options.target
    }

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }

    if (this.options.text) {
      this.root.innerHTML = this.options.text
    }

    return this
  }

  set (link) {
    // console.log('set', text)
    if (link === undefined) return

    this.root.href = link
  }
}

export default Link

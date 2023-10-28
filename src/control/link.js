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
    this.element = document.createElement(this.options.tag)
    this.element.classList.add(this.options.class)

    if (this.options.class !== 'link') {
      this.element.classList.add('link')
    }

    if (this.options.link) {
      this.set(this.options.link)
    }

    if (this.options.target !== 'blank') {
      this.element.target = this.options.target
    }

    if (this.options.container) {
      this.options.container.appendChild(this.element)
    }

    if (this.options.text) {
      this.element.innerHTML = this.options.text
    }

    return this
  }

  set (link) {
    // console.log('set', text)
    if (link === undefined) return

    if (this.options.target === 'blank') {
      this.element.href = '#'
      this.element.addEventListener('click', () => {
        window.open(link)
        return false
      })
    } else {
      this.element.href = link
    }
  }
}

export default Link

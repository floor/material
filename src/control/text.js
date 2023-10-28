import addClass from './module/addclass'

const defaults = {
  class: 'text',
  tag: 'span'
}

class Text {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    // console.log('options', this.options)

    this.build()

    return this
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.element = document.createElement(this.options.tag)
    addClass(this.element, this.options.class)

    if (this.options.class !== 'text') {
      this.element.classList.add('text')
    }

    if (this.options.text) {
      this.set(this.options.text)
    }

    if (this.options.container) {
      this.options.container.appendChild(this.element)
    }

    return this
  }

  set (text) {
    // console.log('set', text)
    if (text === undefined) return

    var label = this.options.label || ''

    if (this.options.textFirst) {
      this.element.innerHTML = text + label
    } else {
      this.element.innerHTML = label + text
    }

    if (this.options.spaceAfter) {
      this.element.innerHTML = this.element.innerHTML + ' '
    }
  }

  setText (text) {
    // console.log('setText', text)
    this.element.innerHTML = text
  }
}

export default Text

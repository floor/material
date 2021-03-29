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
    this.root = document.createElement(this.options.tag)
    addClass(this.root, this.options.class)

    if (this.options.class !== 'text') {
      this.root.classList.add('text')
    }

    if (this.options.text) {
      this.set(this.options.text)
    }

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }

    return this
  }

  set (text) {
    // console.log('set', text)
    if (text === undefined) return

    var label = this.options.label || ''

    this.root.innerHTML = label + text

    if (this.options.spaceAfter) {
      this.root.innerHTML = this.root.innerHTML + ' '
    }
  }

  setText (text) {
    // console.log('setText', text)
    this.root.innerHTML = text
  }
}

export default Text

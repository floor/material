import addClass from './module/addclass'

const defaults = {
  class: 'text',
  tag: 'span',
  seprator: ' | '
}

class List {
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

    if (this.options.list) {
      this.set(this.options.list)
    }

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }

    return this
  }

  set (list) {
    var text = ''

    for (var i = 0; i < list.length; i++) {
      if (i < list.length - 1) {
        text = text + list[i] + this.options.seprator
      } else {
        text = text + list[i]
      }
    }

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

export default List

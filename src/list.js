import * as css from './module/css'

const defaults = {
  className: 'text',
  tag: 'span',
  seprator: ' | '
}

class List {
  static uid = "material-list";

  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    this.build()

    return this
  }

  build () {
    this.element = document.createElement(this.options.tag)
    css.add(this.element, this.options.class)

    if (this.options.class !== 'text') {
      this.element.classList.add('text')
    }

    if (this.options.list) {
      this.set(this.options.list)
    }

    if (this.options.container) {
      this.options.container.appendChild(this.element)
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

    this.element.innerHTML = label + text

    if (this.options.spaceAfter) {
      this.element.innerHTML = this.element.innerHTML + ' '
    }
  }

  setText (text) {
    // console.log('setText', text)
    this.element.innerHTML = text
  }
}

export default List

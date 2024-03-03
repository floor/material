import build from './module/build'

class Text {
  static uid = "material-text";

  static defaults = {
    class: 'text',
    tag: 'span'
  }

  constructor (options) {
    this.init(options)
    this.build()
    this.setup()
  }

  init (options) {
    this.options = Object.assign({}, Text.defaults, options || {})
    Object.assign(this, build)
  }

  setup () {
    if (this.options.text) {
      this.set(this.options.text)
    }
  }

  set (text) {
    // console.log('set', text)
    if (text === undefined) return

    const label = this.options.label || ''

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
    this.element.innerHTML = text
  }

  get () {
    if (this.element.innerHTML) {
      return this.element.innerHTML
    } else {
      return ''
    }
  }
}

export default Text

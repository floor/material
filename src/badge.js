import build from './module/build'

class Badge {
  static defaults = {
    class: 'badge'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, Badge.defaults, options || {})
    Object.assign(this, build)
  }

  set (text) {
    if (text) {
      this.element.innerHTML = text
    } else {
      this.element.innerHTML = ''
    }
  }
}

export default Badge

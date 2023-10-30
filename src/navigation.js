import build from './module/build'

class Navigation {
  static defaults = {
    class: 'navigation'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, Navigation.defaults, options || {})
    Object.assign(this, build)
  }
}

export default Navigation

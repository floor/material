import * as css from './module/css'
import build from './module/build'

class Navigation {
  static defaults = {
    class: 'navigation'
  }

  constructor (options) {
    this.init(options)
    this.build()
    this.setup()
  }

  init (options) {
    this.options = { ...Navigation.defaults, ...options }
    Object.assign(this, build)
  }

  setup() {
    if (this.options.type) css.add(this.element, 'type-', this.options.type)
  }
}

export default Navigation

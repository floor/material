import EventEmitter from './mixin/emitter'
import build from './module/build'

class View extends EventEmitter {
  static defaults = {
    class: 'view',
    type: null
  }

  constructor (options) {
    super()

    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, View.defaults, options || {})
    Object.assign(this, build)
  }
}

export default View

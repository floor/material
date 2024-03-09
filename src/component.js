import create from './mixin/create'
import events from './mixin/events'
import insert from './mixin/insert'

import emitter from './module/emitter'

// Depracted

class Component {
  static defaults = {
    prefix: 'material',
    class: 'component',
    tag: 'span'
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = { ...Component.defaults, ...options }

    Object.assign(this, emitter, events, insert)
  }

  build () {
    this.element = create(this.options)

    if (this.options.container) {
      this.insert(this.options.container)
    }

    return this
  }
}

export default Component

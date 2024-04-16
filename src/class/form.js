import Component from './component'
import events from '../module/events'
import build from '../form/build'

class Form {
  static base = 'form'

  constructor (options) {
    this.options = { ...this.constructor.defaults, ...options }

    const mixins = this.options.mixins || []

    for (let i = 0; i < mixins.length; i++) {
      Object.assign(this, mixins[i])
    }

    Object.assign(this, build)

    this.build(this)

    this.events = {}

    if (this.options.events) {
      events.attach(this.options.events, this)
    }
  }

  on (event, listener) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(listener)

    return this
  }

  emit (event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener.apply(this, args))
    }
    return this
  }
}

export default Form

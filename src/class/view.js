import Component from './component'
import events from '../module/events'

class View extends Component {
  static base = 'view'

  constructor (options) {
    super(options)
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

export default View

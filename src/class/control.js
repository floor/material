import Component from './component'
import events from '../module/events'

class Control extends Component {
  static base = 'control'

  constructor (options) {
    super(options)
    this.events = {}

    if (this.options.events) {
      events.attach(this.options.events, this)
    }
  }

  on (event, listener) {
    this.events[event] ??= []
    this.events[event].push(listener)

    return this
  }

  emit (event, ...args) {
    this.events?.[event]?.forEach(listener => listener.apply(this, args))

    return this
  }

  destroy () {
    // if (this.options.events) {
    //   events.detach(this.options.events, this)
    // }

    super.destroy()
    this.emit?.('destroy')
  }
}

export default Control

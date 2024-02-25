// base class
import EventEmitter from './mixin/emitter'
// related modules
import build from './module/build'
import events from './module/events'
import display from './mixin/display'
// ui element
import Element from './element'
import Text from './text'
import Button from './button'

class Snackbar extends EventEmitter {
  static defaults = {
    class: 'snackbar',
    transition: 225,
    duration: 4000,
    stack: false,
    close: false,
    layout: [
      [Text, 'message', { tag: 'span', class: 'message' }],
      [Element, 'action', { tag: 'span', class: 'action' },
        [Button, 'callback', { class: 'callback', type: 'link' }],
        [Button, 'close', { class: 'close', type: 'action' }]
      ]
    ],
    events: [
      ['ui.callback.click', 'action'],
      ['ui.close.click', 'destroy']
    ]
  }

  constructor (options) {
    super()

    this.init(options)
    this.build(this.constructor)
    this.render()
    events.attach(this.options.events, this)
    this.show()

    if (this.options.duration) {
      setTimeout(() => {
        this.destroy()
      }, this.options.duration)
    }
  }

  init (options) {
    this.options = Object.assign({}, Snackbar.defaults, options || {})
    Object.assign(this, build, display)

    this.buildSnackbarContainer(this.options.container)
  }

  buildSnackbarContainer (container = document.body) {
    // console.log('buildSnackbarContainer', container)

    const snackbarContainer = container.querySelector('.snackbars')

    // console.log('snackbarContainer', snackbarContainer)

    if (!snackbarContainer) {
      this.options.container = document.createElement('div')
      this.options.container.classList.add('snackbars')
      container.appendChild(this.options.container)
    } else {
      if (this.options.stack === false) snackbarContainer.innerHTML = ''
      this.options.container = snackbarContainer
    }
  }

  render () {
    this.ui.message.set(this.options.message)

    if (this.options.action) {
      this.ui.callback.set(this.options.action)
      this.ui.callback.element.classList.add('show')
      this.ui.action.classList.add('show')
    }

    if (this.options.close) {
      this.ui.close.element.classList.add('show')
      this.ui.action.classList.add('show')
    }
  }

  action () {
    // console.log('action')
    this.emit('action')
    this.destroy()
  }

  close () {
    // console.log('close')
    this.destroy()
  }
}

export default Snackbar

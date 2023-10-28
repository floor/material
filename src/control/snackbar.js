// base class
import EventEmitter from '../component/emitter'
// related modules
import build from '../module/build'
import bindEvents from '../module/events'
import display from '../module/display'
// ui element
import Text from './text'
import Button from './button'

class Snackbar extends EventEmitter {
  static defaults = {
    class: 'snackbar',
    transition: 225,
    duration: 4000,
    close: false,
    layout: [
      [Text, 'text', { tag: 'span', class: 'text' }],
      [Button, 'action', { class: 'action', type: 'link' }],
      [Button, 'close', { class: 'close', type: 'action' }]
    ],
    events: [
      ['ui.action.click', 'action'],
      ['ui.close.click', 'destroy']
    ]
  };

  constructor (options) {
    super()
    
    this.init(options)
    this.build(this.constructor)
    this.render()    
    this.bindEvents()
    this.show()

    if (this.options.duration)
      setTimeout(()=>{
        this.destroy()
      }, this.options.duration)
  }

  init(options) {
    this.options = Object.assign({}, Snackbar.defaults, options || {})
    Object.assign(this, build, bindEvents, display)

    this.buildSnackbarContainer(this.options.container)
  }

  buildSnackbarContainer (container = document.body) {
    // console.log('buildSnackbarContainer', container)

    let snackbarContainer = container.querySelector('.snackbars')

    // console.log('snackbarContainer', snackbarContainer)

    if (!snackbarContainer) {
      this.options.container = document.createElement('div')
      this.options.container.classList.add('snackbars')
      container.appendChild(this.options.container)
    } else {
      this.options.container = snackbarContainer
    }
  }

  render () {
    this.ui.text.set(this.options.text)

    if (this.options.action) {
      this.ui.action.set(this.options.action)
      this.ui.action.element.classList.add('show')
    }

    if (this.options.close) this.ui.close.element.classList.add('show')

    return this
  }

  action () {
    // console.log('action')
    this.emit('action')
    this.destroy()
  }

  close() {
    // console.log('close')
    this.destroy()
  }
}

export default Snackbar

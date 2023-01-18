import emitter from './module/emitter'
import attach from './module/attach'

const defaults = {
  class: 'selector',
  tag: 'div',
  styles: ['style', 'color'],
  modules: ['border', 'label', 'resizer'],
  resizer: {
    keepRatio: true,
    minWidth: 10,
    minHeight: 10
  },
  events: [
    ['resizer.pointerdown', 'onPointerDown']
  ]

}

class Selector {
  static isComponent () {
    return true
  }

  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    // console.log('constructor')
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, attach)
    // console.log('options', options)

    this.init()

    return this
  }

  init () {
    this.build()
    this.setup()
    this.attach()

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }
  }

  /**
   * Build Method
   * @return {Object} This class instance
   */
  build () {
    this.root = document.createElement(this.options.tag)

    this.root.classList.add('selector')

    if (this.options.class !== 'selector') {
      this.root.setAttribute('class', this.options.class)
    }

    if (this.options.modules.indexOf('border') > -1) {
      this.border = document.createElement('div')
      this.border.classList.add('border')
      this.root.appendChild(this.border)
    }

    if (this.options.modules.indexOf('label') > -1) {
      this.label = document.createElement('div')
      this.label.classList.add('label')
      this.root.appendChild(this.label)
    }

    if (this.options.modules.indexOf('resizer') > -1) {
      this.resizer = document.createElement('div')
      this.resizer.classList.add('resizer')
      this.root.appendChild(this.resizer)
    }

    return this
  }

  setup () {
    if (!this.options.src) return

    this.setTarget(this.options.element)
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  set (prop, value) {
    // console.log('set', this.root, prop, value)
    switch (prop) {
      case 'target':
        this.setTarget(value)
        break
      default:
        // console.log('prop', prop)
        this.setTarget(prop)
    }

    return this
  }

  setTarget (target) {
    this.target = target

    this.update(this.target)

    this.root.classList.remove('hide')

    // console.log('target', this.root, this.target)
  }

  update (target) {
    target = target || this.target
    if (!target) return
    var coords = target.getBoundingClientRect()
    var pcoords = this.root.parentNode.getBoundingClientRect()

    this.root.style.top = coords.top - pcoords.top + 'px'
    this.root.style.left = coords.left - pcoords.left + 'px'
    this.root.style.width = coords.width + 'px'
    this.root.style.height = coords.height + 'px'
  }

  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   * @return {Object} The class instance
   */
  get (prop, value) {
    switch (prop) {
      case 'value':
        return this.root.value
      case 'label':
        return this.label.innerHTML
      default:
        return this.root.value
    }
  }

  onPointerDown (ev) {
    // console.log('pointerdown', ev.target)
    ev = ev || window.event

    let width = 0
    let height = 0

    const offsetX = this.root.getBoundingClientRect().x
    const offsetY = this.root.getBoundingClientRect().y
    const element = document.body

    var ratio = parseInt(this.root.style.width, 10) / parseInt(this.root.style.height, 10)

    this.border.setPointerCapture(ev.pointerId)

    element.onpointermove = (e) => {
      // console.log('pointermove')

      e.stopPropagation()

      e = e || window.event

      if (e.pageX) width = e.pageX - offsetX
      else if (e.clientX) width = e.clientX - offsetX

      if (e.pageY) height = e.pageY - offsetY
      else if (e.clientY) height = e.clientY - offsetY

      if (width < this.options.resizer.minWidth) width = this.options.resizer.minWidth

      if (this.options.resizer.keepRatio) {
        // console.log('keepRatio', width, ratio)
        height = width / ratio
      } else {
        if (height < this.options.resizer.minHeight) height = this.options.resizer.minHeight
      }

      this.root.style.width = width + 'px'
      this.root.style.height = height + 'px'

      this.emit('resize', width, height)
    }

    element.onpointerup = (e) => {
      // console.log('pointerup', e.target)

      element.onpointermove = null
      element.onpointerup = null
      this.root.releasePointerCapture(e.pointerId)

      // if (e.target !== this.root) return
    }
  }

  disable () {
    this.root.disabled = true
  }

  enable () {
    this.root.disabled = false
  }

  hide () {
    this.root.classList.add('hide')
  }

  show () {
    this.root.classList.remove('hide')
  }

  destroy () {
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }
  }

  click (ev) {
    this.emit('click', ev)
  }

  mousedown (ev) {
    this.root.classList.add('pushed')
  }

  mouseup (ev) {
    this.root.classList.remove('pushed')
  }
}

export default Selector

import touch from './module/touch'

/**
 * Class Tootip
 * @class
 * @since 0.3.16
 * @example
 * var div = new Tootip({
 *   tag: 'div',
 *   class: 'mydiv',
 * })
 */

const defaults = {
  targets: '[data-tooltip]',
  offset: {
    top: 60
  },
  disabled: false
}

class Tooltip {
  static uid = "material-tooltip";

  /**
   * The init method of the Button class
   * @param  {Object} The element attributes
   * @private
   * @return {DOMElement} The dom element
   */
  constructor (options) {
    // console.log('constructor')
    this.options = Object.assign({}, defaults, options || {})
    // console.log('element options', options)

    this.build()
    this.attachEvent()

    return this
  }

  build () {
    const container = this.options.container || document.body

    this.element = document.createElement('span')
    this.element.classList.add('tooltip')
    this.element.classList.add('control')

    this.pointer = document.createElement('span')
    this.pointer.classList.add('pointer')
    this.element.appendChild(this.pointer)

    this.label = document.createElement('span')
    this.label.classList.add('label')
    this.element.appendChild(this.label)

    container.appendChild(this.element)
  }

  attachEvent () {
    // console.log('attach', this.options.targets)
    const targets = document.querySelectorAll(this.options.targets)

    for (let i = 0; i < targets.length; i++) {
      targets[i].addEventListener('mouseover', (e) => {
        // console.log('tooltip', touch(), this.disabled)
        if (touch()) return

        if (this.disabled === true) {
          this.hide()
          return
        }

        if (e.currentTarget.classList.contains('selected')) {
          this.hide()
          return
        }

        this.label.innerHTML = e.currentTarget.dataset.tooltip
        const coord = this.offset(e.currentTarget)

        this.show()
        this.element.style.top = (coord.top + this.options.offset.top) + 'px'
        this.element.style.left = coord.left - (this.element.offsetWidth / 2) + (e.currentTarget.offsetWidth / 2) + 'px'
      })

      targets[i].addEventListener('mouseleave', (e) => {
        this.label.innerHTML = ''
        this.hide()
      })
    }

    this.element.addEventListener('click', (e) => {
      e.preventDefault()
      e.stop()
      this.hide()
    })
  }

  offset (target) {
    const rect = target.getBoundingClientRect()
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
  }

  hide () {
    this.element.classList.remove('show')
  }

  show () {
    this.element.classList.add('show')
  }

  disable () {
    // console.log('disable')
    this.hide()
    this.disabled = true
  }

  enable () {
    // console.log('enable')
    this.disabled = false
  }
}

export default Tooltip

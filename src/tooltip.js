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
    this.attach()

    return this
  }

  build () {
    var container = this.options.container || document.body

    this.root = document.createElement('span')
    this.root.classList.add('tooltip')
    this.root.classList.add('control')

    this.pointer = document.createElement('span')
    this.pointer.classList.add('pointer')
    this.root.appendChild(this.pointer)

    this.label = document.createElement('span')
    this.label.classList.add('label')
    this.root.appendChild(this.label)

    container.appendChild(this.root)
  }

  attach () {
    // console.log('attach', this.options.targets)
    var targets = document.querySelectorAll(this.options.targets)

    for (var i = 0; i < targets.length; i++) {
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
        var coord = this.offset(e.currentTarget)

        this.show()
        this.root.style.top = (coord.top + this.options.offset.top) + 'px'
        this.root.style.left = coord.left - (this.root.offsetWidth / 2) + (e.currentTarget.offsetWidth / 2) + 'px'
      })

      targets[i].addEventListener('mouseleave', (e) => {
        this.label.innerHTML = ''
        this.hide()
      })
    }

    this.root.addEventListener('click', (e) => {
      e.preventDefault()
      e.stop()
      this.hide()
    })
  }

  offset (target) {
    var rect = target.getBoundingClientRect()
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop
    return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
  }

  hide () {
    this.root.classList.remove('show')
  }

  show () {
    this.root.classList.add('show')
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

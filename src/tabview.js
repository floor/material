import emitter from './module/emitter'
import observer from './module/observer'
import display from './view/display'

/**
 * Class Tab
 * @class
 * @since 0.0.1
 * @example
 * var tab = new TabView()
 */

var defaults = {
  class: 'tabview',
  mode: 'style' // css
}

class TabView {
  /**
   * The init method of the Button class
   * @param  {Object} The element attributes
   * @private
   * @return {DOMElement} The dom element
   */
  constructor (options) {
    // console.log('TabView')
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, emitter, display)

    this.build()

    var ready = false

    observer.insert(this.root, () => {
      // console.log('!!! inserted')
      if (!ready) {
        ready = true
        this.setup()
        this.attach()

        this.emit('ready')
      }
    })

    return this
  }

  build () {
    this.root = document.createElement(this.options.tag || 'div')
    this.root.classList.add('tabview')

    this.root.classList.add('view')

    if (this.options.class !== 'tabview') {
      this.root.classList.add(this.options.class)
    }

    this.ui = {}
  }

  setup () {
    // console.log('setup')
    this.view = {}
    this.views = []

    this.ui.tabs = this.root.querySelector('[class="tabs"]')
    this.ui.view = this.root.querySelector('[class="views"]')
    this.ui.indicator = this.root.querySelector('[class="indicator"]')

    this.ui.buttons = this.ui.tabs.childNodes
    this.ui.views = this.ui.view.childNodes

    // console.log('views', this.ui.views)

    for (var i = 0; i < this.ui.views.length; i++) {
      if (this.ui.views[i].dataset) {
        this.views.push(this.ui.views[i].dataset.view)
        this.view[this.ui.views[i].dataset.view] = this.ui.views[i]
      }
    }

    this.hideView()

    this.click(this.ui.buttons[0])
  }

  attach () {
    this.ui.tabs.addEventListener('click', (e) => {
      e.stopPropagation()
      if (e.target === e.currentTarget) return

      if (e.target.matches('BUTTON')) {
        this.click(e.target)
      }
    })
  }

  select (view) {
    // console.log('select', view, this.ui.tabs)
    if (this.ui && this.ui.tabs) {
      var button = this.ui.tabs.querySelector('[data-view="' + view + '"]')
      // console.log('tab', button)
      if (button) {
        this.click(button)
      }
    } else {
      this.emit('notready')
    }
  }

  disable (view) {
    // console.log('select', view)
    if (this.ui && this.ui.tabs) {
      var button = this.ui.tabs.querySelector('[data-view="' + view + '"]')
      // console.log('tab', button)
      if (button) {
        button.disabled = 'disabled'
      }
    } else {
      this.emit('notready')
    }
  }

  enable (view) {
    // console.log('select', view)

    if (this.ui && this.ui.tabs) {
      var button = this.ui.tabs.querySelector('[data-view="' + view + '"]')
      // console.log('tab', button)
      if (button) {
        button.disabled = false
      }
    } else {
      this.emit('notready')
    }
  }

  hideView () {
    // console.log('hideView')
    for (var i = 0; i < this.ui.views.length; i++) {
      // console.log('hide', this.ui.views[i])
      this.ui.views[i].classList.add('hide')
    }
  }

  click (button) {
    // console.log('click', button.dataset.view, true)
    var view = this.ui.view.querySelector('[data-view="' + button.dataset.view + '"]')
    this.hideView()

    if (this.button) {
      this.button.classList.remove('selected')
    }

    this.button = button

    button.classList.add('selected')

    this.indicator(button)

    if (view) {
      view.classList.remove('hide')
    } else {
      console.log('view ', button.dataset.view, button, this.ui.views, ' not found')
    }

    this.emit('select', button.dataset.view)

    return view
  }

  indicator (button) {
    if (!this.ui.indicator) return

    var t = this.ui.tabs.getBoundingClientRect()
    var b = button.getBoundingClientRect()

    // console.log('tab rect', b.height, b.height)

    this.ui.indicator.style.top = t.height - 2 + 'px'
    this.ui.indicator.style.left = (b.left - t.left) + 'px'
    this.ui.indicator.style.width = b.width + 'px'
  }
}

export default TabView

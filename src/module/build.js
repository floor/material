import dataset from './dataset'
import Layout from '../layout'

export default {
  build () {
    this.element = document.createElement(this.options.tag || 'div')

    const defaults = this.constructor.defaults || {}

    if (defaults.base) this.element.classList.add(defaults.base)

    if (defaults.class) this.element.classList.add(defaults.class)

    if (this.options.class !== defaults.class) {
      this.addClass(this.options.class)
    }

    if (this.options.data) {
      dataset(this.element, this.options.data)
    }

    if (this.options.base === 'view') {
      this.container = this.options.container || document.body
    } else {
      this.container = this.options.container
    }

    if (this.container) this.appendTo(this.container)

    if (this.options.layout) {
      this.layout = new Layout(this.options.layout, this.element)
      this.ui = this.layout.component
    }

    if (this.options.show === true && this.show) this.show()
  },

  appendTo (container) {
    container.appendChild(this.element)
  },

  addClass (clss) {
    const c = clss.replace(/\s+/g, ' ').trim()
    const list = c.split(' ')
    list.forEach(item => this.element.classList.add(item))
  }
}

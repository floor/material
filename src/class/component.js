import build from '../module/build'
import dom from '../module/dom'

class Component {
  static base = 'component'

  constructor (options) {
    this.options = { ...this.constructor.defaults, ...options }

    const mixins = this.options.mixins || []

    for (let i = 0; i < mixins.length; i++) {
      Object.assign(this, mixins[i])
    }

    build(this)
  }

  destroy () {
    console.log('dest5roy')
    if (this.options.transition && this.element) {
      this.element.classList.remove('show')

      if (this.underlay) {
        this.underlay.classList.remove('show')
      }

      setTimeout(() => {
        dom.destroy(this.element)
        if (this.underlay) dom.destroy(this.underlay)
      }, this.options.transition)
    } else {
      dom.destroy(this.element)
      if (this.underlay) dom.destroy(this.underlay)
    }
  }
}

export default Component

import build from '../module/build'

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
}

export default Component

// import modules
import create from './mixin/create'
import insert from './mixin/insert'
// import components
import Layout from './layout'

const defaults = {
  prefix: 'material',
  class: 'card',
  tag: 'div'
}

class Card {
  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = Object.assign({}, defaults, options || {})
    Object.assign(this, insert)
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build () {
    this.element = create(this.options)

    if (this.options.layout) {
      this.layout = new Layout(this.options.layout, this.element)
    }
  }
}

export default Card

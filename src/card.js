'use strict'

// import modules
import init from './component/init'
import create from './element/create'
import insert from './component/insert'
import classify from './component/classify'
// import components
import Layout from './layout'

let defaults = {
  prefix: 'material',
  class: 'card',
  tag: 'div'
}

class Card {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
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
    this.root = create(this.options.tag)
    classify(this.root, this.options)

    if (this.options.layout) {
      this.layout = new Layout(this.options.layout, this.root)
    }
  }
}

export default Card

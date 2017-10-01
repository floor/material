'use strict'

// import modules
import init from './component/init'
import merge from './module/merge'
import create from './element/create'
import insert from './component/insert'
import classify from './component/classify'
// import components
import Layout from './layout'

let defaults = {
  prefix: 'material',
  class: 'card',
  modules: [insert]
}

class Card {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = merge(defaults, options || {})

    init(this)
    this.build()
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build () {
    var tag = this.options.tag || 'div'

    this.wrapper = create(tag)
    classify(this.wrapper, this.options)

    this.options.layout.wrapper = this.wrapper
    this.layout = new Layout(this.options.layout)
  }
}

export default Card

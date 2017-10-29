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
  class: 'snackbar'
}

class Snackbar {
  /**
   * Constructor
   * @param  {Object} options - Component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    this.init()
    this.build()
  }

  init () {
    Object.assign(this, insert)
  }

  /**
   * build the component using the super method
   * @return {Object} The class instance
   */
  build () {
    var tag = this.options.tag || 'div'

    this.wrapper = create(tag, 'dark-theme')
    classify(this.wrapper, this.options)

    this.layout = new Layout(this.options.layout, this.wrapper)
  }
}

export default Snackbar

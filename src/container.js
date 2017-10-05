'use strict'

import create from './element/create'
import insert from './element/insert'
import classify from './component/classify'

const defaults = {
  prefix: 'material',
  class: 'container',
  tag: 'div'
}

/**
 * container function
 * @function
 * @since 0.0.1
 */
const container = (params) => {
  // init options
  const options = Object.assign({}, defaults, params || {})

  // create button element and classify
  var element = create(options.tag, options.prefix + '-' + options.class)
  classify(element, options)

  // insert into the container if exists
  if (options.container) {
    insert(element, options.container)
  }

  // public API
  var api = {
    wrapper: element,
    insert: (container, context) => {
      insert(element, container, context)
      return api
    }
  }

  return api
}

export default container
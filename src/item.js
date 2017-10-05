'use strict'

import create from './element/create'
import insert from './element/insert'
import classify from './component/classify'

const defaults = {
  prefix: 'material',
  class: 'item',
  tag: {
    default: 'span',
    display4: 'h1',
    display3: 'h1',
    display2: 'h1',
    display1: 'h1',
    headline: 'h1',
    title: 'h2',
    subheading2: 'h3',
    subheading1: 'h4',
    body: 'p',
    body2: 'aside',
    caption: 'span'
  }
}

/**
 * item function
 * @function
 * @since 0.0.1
 */
const item = (params) => {
  // init options
  const options = Object.assign({}, defaults, params || {})

  var tag = options.tag[options.type] || options.tag.default

  // create button element and classify
  var element = create(tag)
  classify(element, options)

  // public API
  var api = {
    wrapper: element,
    insert: (container, context) => {
      insert(element, container, context)
      return api
    },
    set: (value) => {
      if (!value) return
      if (element.innerText) {
        element.innerText = value
      } else {
        element.textContent = value
      }

      return api
    }
  }

  // insert into the container if exists
  if (options.container) {
    insert(element, options.container)
  }

  // set text
  api.set(options.text)

  return api
}

export default item
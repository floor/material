'use strict'

import create from './element/create'
import insert from './element/insert'
import classify from './component/classify'
import ripple from './element/ripple'
import emitter from './module/emitter'
import label from './component/label'
import icon from './component/icon'

const defaults = {
  prefix: 'material',
  class: 'button',
  tag: 'button'
}

/**
 * button function
 * @function
 * @since 0.0.1
 */
const button = (params) => {
  // init options
  const options = Object.assign({}, defaults, params || {})

  // init vars
  var text = options.label || options.text
  var svg = options.icon
  var disabled = options.disabled || false

  // create button element and classify
  var element = create(options.tag, options.prefix + '-' + options.class)
  classify(element, options)

  // create and insert label and icon
  label(element, text, options)
  icon(element, svg, options)

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
    },
    disable: () => {

    }
  }

  // augment api with emitter
  Object.assign(api, emitter)

  // event related functions and listeners
  /**
   * on element click
   * @param  {event} e click event
   * @return {void}
   */
  function click(e) {
    e.preventDefault()

    if (disabled === true) return
    if (options.upload) return

    api.emit('click', e)
  }

  /**
   * on element mousedown
   * @param  {event} e click event
   * @return {void}
   */
  function mousedown(e) {
    if (disabled === true) return
    if (options.upload) return

    ripple(e, options.ripple)
  }

  element.addEventListener('click', click)
  element.addEventListener('mousedown', mousedown)

  return api
}

export default button
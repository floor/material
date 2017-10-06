'use strict'

import create from './element/create'
import insert from './element/insert'
import classify from './component/classify'
import ripple from './element/ripple'
import click from './component/click'
import emitter from './module/emitter'
import attach from './module/attach'
import emit from './component/emit'
import label from './component/label'
import icon from './component/icon'

const defaults = {
  prefix: 'material',
  class: 'button',
  tag: 'button',
  role: 'button',
  events: [
    ['wrapper.click', 'click'],
    ['wrapper.mousedown', ripple]
  ]
}
/**
 * button component
 * @module button
 * @category component
 */
/**
 * button function
 * @function
 * @since 0.0.1
 */
const button = (params) => {
  // init options
  const options = Object.assign({}, defaults, params || {})

  var element = {}
  var component = {}

  // init vars
  var text = options.label || options.text
  var svg = options.icon
  var disabled = options.disabled || false

  // create button element and classify
  var wrapper = create(options.tag)
  classify(wrapper, options)

  // create and insert label and icon
  label(wrapper, text, options)
  icon(wrapper, svg, options)

  // insert inside the container
  if (options.container) {
    insert(wrapper, options.container)
  }

  /**
   * Public API
   * @type {Object}
   */
  var api = {
    wrapper: wrapper,
    /**
     * pubic insert method
     * @param  {HTMLElement} container [description]
     * @param  {string} context   where the element will be inserted
     * @return {object}           return api
     */
    insert: (container, context) => {
      insert(wrapper, container, context)
      return api
    },
    disable: () => {
      wrapper.setAttribute('disabled', 'disabled');
    }
  }

  component.click = (e) => {
    emit(api, 'click', e)
  }

  // assign emitter to api
  Object.assign(api, emitter)

  // assign api to component
  Object.assign(component, api)

  attach(component, options.events)

  return api
}

export default button
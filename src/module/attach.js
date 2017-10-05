'use strict'

import extract from './extract'

/**
 * attach function to events
 * @module module/attach
 * @category module
 */

/**
 * [attach description]
 * @param  {object} component [description]
 * @param  {[type]} events    [description]
 * @return {[type]}           [description]
 */
function attach(component, events) {
  // console.log('attach', component, events)

  events.map((def) => {
    // console.log('map', def)

    var e = extract.e(component, def[0])
    var f = extract.f(component, def[1])

    e.element.addEventListener(e.name, f)
  })
}

export default attach
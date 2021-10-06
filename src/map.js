
import mediator from '../module/mediator'
import emitter from 'material/src/module/emitter'
import attach from 'material/src/module/attach'

import init from './map/init'
import build from './map/build'
import viewport from './map/viewport'
import countries from './map/countries'
import set from './map/set'
import mouse from './map/mouse'
import display from './map/display'
import mode from './map/mode'
import select from './map/select'
import focus from './map/focus'

const events = [
  ['root.mousedown', 'mouseDown'],
  ['root.mouseup', 'mouseUp'],
  ['root.mousemove', 'mouseMove'],
  ['root.mouseleave', 'mouseLeave'],
  ['root.mouseout', 'mouseOut'],
  ['root.click', 'mouseClick'],
  ['root.touchStart', 'mouseClick']
]

const defaults = {
  class: 'worldmap',
  tag: 'main',
  zoom: 0.3,
  isocodes: [],
  mode: 'unique',
  path: '/dist/map/',
  pinchZoom: {
    maxZoom: 128,
    minZoom: 3,
    setOffsetsOnce: true,
    verticalPadding: 64,
    horizontalPadding: 64,
    tapZoomFactor: 0
  }
}

class Map {
  /**
   * Constructor component options
   * @return {Object} Class instance
   */
  constructor (options) {
    this.options = Object.assign({}, defaults, options || {})

    Object.assign(
      this, attach, emitter, init, build, viewport, mouse,
      mode, countries,
      set, display, select, focus
    )

    mediator.installTo(this)

    this.init(options)

    this.build()
    this.attach(events)

    this.publish('initWorldmap')

    return this
  }
}

export default Map

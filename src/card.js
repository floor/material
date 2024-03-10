import build from './mixin/build'
import display from './mixin/display'
import position from './mixin/position'

class Card {
  static defaults = {
    class: 'card',
    position: {
      align: 'center',
      vAlign: 'dynamic',
      offsetX: 10,
      offsetY: 10
    },
    close: true,
    layout: []
  }

  constructor (options) {
    this.init(options)
    this.build()
  }

  init (options) {
    this.options = { ...Card.defaults, ...options }
    Object.assign(this, build, display, position)
  }
}

export default Card

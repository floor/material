import {
  Component,
  display,
  position
} from '../'

// import position from './mixin/position'

console.log('position', position)

class Card extends Component {
  static defaults = {
    class: 'card',
    mixins: [display, position],
    position: {
      align: 'center',
      vAlign: 'dynamic',
      offsetX: 10,
      offsetY: 10
    },
    close: true
  }
}

export default Card

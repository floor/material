/**
 * Element options
 */
export default {
  prefix: 'material',
  class: 'layout',
  tag: 'div',
  settings: {
    list: {
      width: 320
    },
    navi: {
      width: 230,
      display: 'normalized'
    }
  },
  direction: 'horizontal',
  position: 'flex',
  resizer: {
    modifier: {
      row: {
        size: 'width',
        from: 'left',
        mode: {
          y: false
        }
      },
      column: {
        size: 'height',
        from: 'top',
        mode: {
          x: false
        }
      }
    }
  }
}

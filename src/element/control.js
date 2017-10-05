import insert from './insert'
import emitter from '../module/emitter'

var control = {
  insert: (container, context) => {
    insert(this.wrapper, container, context)
    return api
  },
  disable: () => {

  }
}

Object.assign(control, emitter)

export default control
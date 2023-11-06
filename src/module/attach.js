import extract from './extract'
import last from './last'

const attachModule = {
  attach (events) {
    events = events || this.options.events
    if (!events) return

    events.map(([eventDef, funcDef, option]) => {
      const e = extract.e(this, eventDef)
      const isFunction = typeof funcDef === 'function'
      let f = null
      let keys = []

      if (!isFunction) {
        f = extract.f(this, funcDef)
        keys = funcDef.split('.')
        keys.pop()
      }

      const bound = last(keys.join('.'), this)

      let handler = null

      if (isFunction) {
        handler = funcDef.bind(this)
      } else if (f && bound) {
        handler = f.bind(bound)
      } else {
        // console.error(`Can't bind function for ${eventDef}`)
        return
      }

      if (handler && e && e.element && e.element.addEventListener) {
        if (option) {
          e.element.addEventListener(e.name, handler, option)
        } else {
          e.element.addEventListener(e.name, handler)
        }
      } else if (e && e.element && e.element.on && handler) {
        e.element.on(e.name, handler)
      } else {
        // console.error(`Can't attach ${eventDef}`)
      }
    })

    return this
  }

}

export default attachModule

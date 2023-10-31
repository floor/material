import extract from './extract'

const attachModule = {
  bindEvents (events) {
    events = events || this.options.events
    if (!events) return

    events.map(([eventDef, funcDef, option]) => {
      const e = extract.e(this, eventDef)
      const isFunction = typeof funcDef === 'function'
      const f = isFunction ? null : extract.f(this, funcDef)
      const keys = funcDef.split('.')
      keys.pop()
      const bound = this.last(keys.join('.'))

      let handler = null

      if (isFunction && funcDef) {
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
  },

  last (str) {
    if (!str) return this
    if (!str.includes('.')) return this[str]

    return str.split('.').reduce((acc, key) => acc[key], this)
  }
}

export default attachModule

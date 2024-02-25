import extract from './extract'
import last from './last'

const events = {
  eventHandlers: [], // Utiliser un tableau pour stocker les événements et les gestionnaires

  attach (eventsArray, context) {
    if (!eventsArray) return

    eventsArray.forEach(([eventDef, funcDef, option]) => {
      const e = extract.e(context, eventDef)
      const isFunction = typeof funcDef === 'function'
      let f = null
      let keys = []

      if (!isFunction) {
        f = extract.f(context, funcDef)
        keys = funcDef.split('.')
        keys.pop()
      }

      const bound = last(keys.join('.'), context)

      let handler = null

      if (isFunction) {
        handler = funcDef.bind(context)
      } else if (f && bound) {
        handler = f.bind(bound)
      } else {
        // console.error(`Can't bind function for ${eventDef}`)
        return
      }

      if (handler && e && e.element && e.element.addEventListener) {
        e.element.addEventListener(e.name, handler, option)
        this.eventHandlers.push({ eventDef, element: e.element, handler })
      } else if (e && e.element && e.element.on && handler) {
        e.element.on(e.name, handler)
        this.eventHandlers.push({ eventDef, element: e.element, handler })
      } else {
        // console.error(`Can't attach ${eventDef}`)
      }
    })

    return this
  },

  detach (eventsArray, context) {
    (eventsArray || []).forEach(([eventDef]) => {
      this.eventHandlers.forEach((handlerObj, index) => {
        if (handlerObj.eventDef === eventDef) {
          const { element, handler } = handlerObj
          if (element.removeEventListener) {
            element.removeEventListener(eventDef, handler)
          } else if (element.off) {
            element.off(eventDef, handler)
          }
          delete this.eventHandlers[index]
        }
      })
      this.eventHandlers = this.eventHandlers.filter(Boolean) // Nettoyer les entrées supprimées
    })
  }
}

export default events

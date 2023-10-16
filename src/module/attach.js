import extract from './extract'

/**
 * attach function to events
 * @module module/attach
 * @category module
 */

export default {
  attach: function (events) {
    events = events || this.options.events
    if (!events) return

    var instance = this
    events.map((def) => {
      var e = extract.e(instance, def[0])
      var f = extract.f(instance, def[1])
      var option = def[2]

      var keys = def[1].split('.')
      keys.pop()
      var bound = this.last(keys.join('.'))

      if (f && bound && e && e.element && e.element.addEventListener) {
        if (!f) { console.log('error') }

        // Use passive: true for passive event listeners
        var eventOptions = option || { passive: true }

        e.element.addEventListener(e.name, f.bind(bound), eventOptions)
      } else if (e && e.element && e.element.on && f && bound) {
        e.element.on(e.name, f.bind(bound))
      } else {
        // console.trace('can\'t attach', def[0])
        // console.log('can\'t attach', def[0])
      }
    })

    return this
  },

  /**
   * Return the last reference from an object
   * @param  {string} str Object path for example key1.key2.key3
   * @return {value} The value of the last reference
   */
  last: function (str) {
    if (!str) return this

    const keys = str.split('.')
    let last = this

    for (const key of keys) {
      last = last[key]
      if (last === undefined) return undefined
    }

    return last
  }
}

import extract from './extract'

export default {
  bindEvents: function (events) {
    console.log('bindEvents', events)
    events = events || this.options.events
    if (!events) return

    console.log('attach', events, this)
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

        if (option) {
          e.element.addEventListener(e.name, f.bind(bound), option)
        } else {
          e.element.addEventListener(e.name, f.bind(bound))
        }
      } else if (e && e.element && e.element.on && f && bound) {
        e.element.on(e.name, f.bind(bound))
      } else {
        // console.log('can\'t attach', def[0])
      }
    })

    return this
  },

  last: function (str) {
    // console.log('_path', str)
    if (!str) return this
    else if (!str.match(/\./)) return this[str]
    var last

    var keys = str.split('.')
    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i]

      last = last || this
      last = last[key]
    }

    return last
  }
}

export default {
  (str) => {
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

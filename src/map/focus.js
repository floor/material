export default {
  /**
   * Focus on country
   * @param  {[type]} country isocode
   * @return {[type]}         [description]
   */
  focus (country) {
    // console.log('focus', country)
    var part = this.getCountryParts(country)
    // console.log('focus on part', part)
    this.draggable.focus(part)

    return part
  },

  getCountryParts (country) {
    // console.log('focus', country)
    var parts = this.map.querySelectorAll('[data-isocode="' + country + '"]')
    // console.log('parts', parts)

    return this.getBiggestPart(parts)
  },

  getBiggestPart (parts) {
    var surface = 0
    var biggest = null
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i]
      var rect = part.getBoundingClientRect()

      if (rect.width * rect.height > surface) {
        surface = rect.width * rect.height
        biggest = part
      }
    }

    return biggest
  }
}

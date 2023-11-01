export default {
  /**
   * Focus on country
   * @param  {[type]} country isocode
   * @return {[type]}         [description]
   */
  focus (country) {
    // console.log('focus', country)
    const part = this.getCountryParts(country)
    // console.log('focus on part', part)
    this.draggable.focus(part)

    return part
  },

  getCountryParts (country) {
    // console.log('focus', country)
    const parts = this.map.querySelectorAll('[data-isocode="' + country + '"]')
    // console.log('parts', parts)

    return this.getBiggestPart(parts)
  },

  getBiggestPart (parts) {
    let surface = 0
    let biggest = null
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const rect = part.getBoundingClientRect()

      if (rect.width * rect.height > surface) {
        surface = rect.width * rect.height
        biggest = part
      }
    }

    return biggest
  }
}

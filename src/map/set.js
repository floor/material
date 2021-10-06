
export default {
  /**
   * Setter
   * @param {string} prop
   * @param {string} value
   */
  set (prop, value, options) {
    // console.log('set worldmap', prop, value)
    switch (prop) {
      case 'isocodes':
        this.setIsocodes(value)
        break
      case 'zoom':
        this.setZoom(value, options)
        break
      case 'selected':
        this.highlight(value, options)
        break
      case 'map':
        this.setMap(value)
        break
      case 'mode':
        this.setMode(value)
        break
      default:
        this.setIsocodes(prop)
        break
    }

    return this
  },

  get (prop) {
    // console.log('set worldmap', prop, value)
    switch (prop) {
      case 'zoom':
        return this.zoom
        break
      case 'isocodes':
        return this.isocodes
        break
      case 'map':
        return this.map
        break
      case 'mode':
        return this.mode
        break
      default:
        return this.isocodes
        break
    }
  },

  setIsocodes (isocodes) {
    this.isocodes = this.isocodes || []
    var l = this.isocodes.length
    for (var i = 0; i < l; i++) {
      var isocode = this.isocodes.splice(0, 1)
      this.highlight(isocode, false)
    }

    this.isocodes = isocodes
    this.highlight(this.isocodes)
  },

  setZoom (delta) {
    // console.log('set zoom', delta)
    if (this.draggable.setZoom) { this.draggable.setZoom(delta) }
  }
}

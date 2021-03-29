export default {

  updatePaths () {
    this.path = {}
    this.paths = []
    var paths = this.paths = this.map.querySelectorAll('path')
    this.path = this.path || {}

    for (var i = 0; i < paths.length; i++) {
      var path = paths[i]
      var rect = path.getBoundingClientRect()
      this.path[i] = rect
    }
  },

  updateViewport () {
    console.log('updateViewport', this.rect, this.screen)
    var paths = this.paths
    for (var i = 0; i < paths.length; i++) {
      var path = paths[i]
      if (this.viewport(this.path[i])) {
        path.classList.remove('hide')
      } else {
        path.classList.add('hide')
      }
    }
  },

  viewport (rect) {
    if (!rect) return

    // *var rect = this.path[path]

    var top = rect.top
    var left = rect.left
    var width = rect.width
    var height = rect.height

    return (
      top >= this.screen.y &&
      left >= this.screen.x &&
      (top + height) <= (this.screen.y + this.screen.height) &&
      (left + width) <= (this.screen.x + this.screen.width)
    )
  }
}

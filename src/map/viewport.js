export default {

  updatePaths () {
    this.path = {}
    this.paths = []
    const paths = this.paths = this.map.querySelectorAll('path')
    this.path = this.path || {}

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
      const rect = path.getBoundingClientRect()
      this.path[i] = rect
    }
  },

  updateViewport () {
    console.log('updateViewport', this.rect, this.screen)
    const paths = this.paths
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i]
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

    const top = rect.top
    const left = rect.left
    const width = rect.width
    const height = rect.height

    return (
      top >= this.screen.y &&
      left >= this.screen.x &&
      (top + height) <= (this.screen.y + this.screen.height) &&
      (left + width) <= (this.screen.x + this.screen.width)
    )
  }
}

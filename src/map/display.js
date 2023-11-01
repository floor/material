
export default {
  setMap (decades, cb) {
    // console.log('setMap', decades)
    // object used to cache map by decade
    this.mapsvg = this.mapsvg || {}

    const decade = decades[0]

    // do not update map when in taxi mode
    // if (typeof decade !== 'number') {
    //   return
    // }

    // map is cached, use it
    if (this.mapsvg[decade]) {
      this.initMap(this.mapsvg[decade], decades)

      // execute callback
      if (cb) cb()
    } else {
      // fetch map for the corresponding decade
      const url = this.options.path + decade + '.svg'
      // console.log(url)
      fetch(url).then((response) => {
        response.text().then((map) => {
          this.mapsvg[decade] = map
          this.initMap(map, decades)

          // execute callback
          if (cb) cb()
        })
      })
    }
  },

  initMap (map, decades) {
    // console.log('initMap', decades)
    this.insertMap(map)

    this.highlight(this.isocodes)
    this.publish('mapReady', decades)

    // this.optimizeMap(decades[0])

    // this is the beginning of the map that will hide path
    // if out of the viewport

    // this.updatePaths()
    // this.updateViewport()
  },

  optimizeMap (decade) {
    // console.log('optimizing map', decade)
    const parts = this.map.querySelectorAll('g[data-isocode]')
    const country = {}

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const code = part.dataset.isocode
      if (!country[code]) {
        country[code] = part
      } else {
        country[code].appendChild(part.firstChild)
        part.parentNode.removeChild(part)
      }
    }
  },

  insertMap (map) {
    this.svg.innerHTML = map
    // this.updateSize()
    this.updatePosition()
  },

  updatePosition () {
    // console.log('updatePosition')
    // this.screenSize()
    // this.updateRoot()
    this.map.classList.add('show')
    // this.updateMap()
  },

  updateRoot () {
    this.offsetX = this.screen.width - this.element.offsetWidth
    this.offsetY = this.screen.height - this.element.offsetHeight

    // console.log('--', this.offsetX / 2 + 'px')

    this.element.style.left = (this.offsetX / 2) + 'px'
    this.element.style.top = (this.offsetY / 2) + 'px'

    // if (isTouchScreen()) {
    //   this.element.style.top = (this.offsetY / 2) + 70 + 'px'
    // } else {
    //   this.element.style.top = -1200 + 'px'
    // }
  },

  updateMap () {
    const offsetX = this.element.offsetWidth - this.map.offsetWidth
    // var offsetY = this.element.height - this.map.offsetHeight

    // console.log('--', this.offsetX / 2 + 'px')

    this.map.style.left = (offsetX / 2) + 'px'

    // if (isTouchScreen()) {
    //   this.map.style.top = (offsetY / 2) + 70 + 'px'
    // } else {
    //   this.map.style.top = -1200 + 'px'
    // }
  },

  screenSize () {
    // console.log('screensize')
    const width = window.innerWidth ||
    document.documentElement.clientWidth ||
    document.body.clientWidth

    const height = window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight

    const screen = {
      width,
      height
    }

    this.screen = screen

    return screen
  }

}

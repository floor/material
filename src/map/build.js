import observer from '../module/observer'
import Islands from '../view/islands'
import preventPullRefresh from '../module/preventPullRefresh'
import touch from '../module/touchscreen'
import PinchZoom from '../module/pinchzoom'
import PanZoom from '../module/panzoom'
// import PinchZoomElement from '../../module/pinch-zoom'

export default {

  /**
   * Build worlddmap related methods
   * @return {void} This class instance
   */
  build () {
    this.root = document.createElement(this.options.tag)
    this.root.classList.add(this.options.class)

    if (this.options.container) {
      this.options.container.appendChild(this.root)
    }

    this.label = document.createElement('div')
    this.label.classList.add('country-label')
    document.body.appendChild(this.label)

    this.buildMap()
    this.screenSize()

    observer.insert(this.root, () => {
      // if (touch()) {
      //   // console.log('pinchzoom', this.options.pichZoom)
      //   this.draggable = new PinchZoom(this.slide, {
      //     maxZoom: 128,
      //     minZoom: 3,
      //     setOffsetsOnce: true,
      //     verticalPadding: 64,
      //     horizontalPadding: 64,
      //     onZoomStart: function (object, event) {
      //       object.el.classList.add('zoom')
      //     },
      //     onZoomEnd: function (object, event) {
      //       object.el.classList.remove('zoom')
      //     },
      //     onDragStart: function (object, event) {
      //       object.el.classList.add('drag')
      //     },
      //     onDragEnd: function (object, event) {
      //       object.el.classList.remove('drag')
      //     }

      //   })
      // } else {
        // console.log('panzoom')
      this.draggable = new PanZoom(this.slide, {
        maxZoom: 16,
        minZoom: 1
      })
      // }

      this.rect = this.root.getBoundingClientRect()

      this.screen = {
        y: window.pageYOffset,
        x: window.pageXOffset,
        height: window.innerHeight,
        width: window.innerWidth
      }
    })

    this.islands = new Islands({
      container: this.options.container,
      map: this.map
    })

    return this
  },

  /**
   * BuildMmap method for container background and vector map
   * @return {[type]} [description]
   */
  buildMap () {
    // console.log('buildmap')
    this.slide = document.createElement('div')
    this.slide.classList.add('slide')
    this.root.appendChild(this.slide)

    this.map = document.createElement('div')
    this.map.classList.add('map')
    this.slide.appendChild(this.map)

    this.bg = document.createElement('div')
    this.bg.classList.add('bg')
    this.map.appendChild(this.bg)

    this.svg = document.createElement('div')
    this.svg.classList.add('svg')
    this.map.appendChild(this.svg)

    preventPullRefresh(this.map)
  }
}

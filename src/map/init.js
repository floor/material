import mediator from '../module/mediator'
import { isocode } from '../data/country'

export default {
  /**
   * init method
   * @param  {Object} Options object
   * @return {void} Null
   */
  init (options) {
    this.initMediator()

    this.mode = this.options.mode
    this.country = isocode
    this.isocodes = []
    this.zoom = this.options.zoom
    this.playing = null
    this.isocodes = this.options.isocodes || []
  },

  initMediator () {
    mediator.installTo(this)
  }
}

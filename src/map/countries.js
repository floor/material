
export default {
  /**
   * [updateCountries description]
   * @param  {[type]} countries [description]
   * @return {[type]}           [description]
   */
  updateCountries (isocodes) {
    // console.log('updateCountries', isocodes.length)
    var list = document.querySelectorAll('svg.mapsvg g')
    // console.log('svg', list)

    for (var i = 0; i < list.length; i++) {
      if (isocodes.indexOf(list[i].dataset.isocode) > -1) {
        list[i].classList.remove('empty')
      } else {
        list[i].classList.add('empty')
      }
    }

    // set a random isocode if not defined
    // if (!this.isocode) {
    //   this.random(isocodes)
    // }
  },

  /**
   * [random description]
   * @param  {[type]} isocodes [description]
   * @return {[type]}          [description]
   */
  random (isocodes) {
    // console.log('random', isocodes.length)
    let i = Math.floor(Math.random() * isocodes.length)
    this.isocodes = isocodes[i]
    this.highlight(this.isocodes)

    this.emit('select', this.isocodes)
  },

  /**
   * [setAllCountries description]
   */
  setAllCountries () {
    var list = document.querySelectorAll('svg.mapsvg g')
    // console.log('svg', list)

    for (var i = 0; i < list.length; i++) {
      list[i].classList.remove('empty')
    }
  },

  /**
   * Highlight/unhighlight country on the for the given isocode
   * @param  {[type]} isocode [description]
   * @param  {[type]} option  [description]
   * @return {[type]}         [description]
   */
  highlight (isocodes, option) {
    // console.log('highlight', isocode, option)

    if (!isocodes) return

    if (typeof isocodes === 'string') {
      this.highlightCountry(isocodes, option)
    } else {
      for (var i = 0; i < isocodes.length; i++) {
        this.highlightCountry(isocodes[i], option)
      }
    }
  },

  /**
   * [highlightCountry description]
   * @param  {[type]} isocode [description]
   * @param  {[type]} option  [description]
   * @return {[type]}         [description]
   */
  highlightCountry (isocode, option) {
    // console.log('highlightCountry', isocode, option)
    var group = this.map.querySelector('[data-isocode="' + isocode + '"]')

    if (!group) return

    if (option === false) {
      group.classList.remove('selected')
    } else {
      group.classList.add('selected')
    }

    if (option === 'playing') {
      this.removePlaying()
    }
  },

  /**
   * Highlight/unhighlight country on the for the given isocode
   * @param  {[type]} isocode [description]
   * @param  {[type]} option  [description]
   * @return {[type]}         [description]
   */
  highlightGroup (group) {
    // console.log('highlightGroup', group)

    if (!group) return

    group.classList.add('selected')
  },

  removePlaying () {
    var group = document.querySelector('svg.mapsvg g.playing')
    group.classList.remove('playing')
  }
}

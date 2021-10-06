export default {
  select (isocode, group) {
    this.isocodes = this.isocodes || []
    // console.log('select', isocode)
    if (!isocode) {
      return
    }

    // console.log('islands', this.islands)

    this.unSelectIsland()

    if (this.mode !== 'multiple') {
      if (this.isocodes[0] === isocode) return
      this.highlight(this.isocodes[0], false)
      this.highlight(isocode)
      this.isocodes = [isocode]
    } else {
      this.isocodes = this.isocodes || []
      var index = this.isocodes.indexOf(isocode)
      if (index > -1) {
        this.isocodes.splice(index, 1)
        this.highlight(isocode, false)
      } else {
        this.isocodes.push(isocode)
        this.highlight(isocode)
      }
    }

    this.publish('countrySelect', this.isocodes)

    return this
  },

  selectIsland (island) {
    // console.log('selectIsland', island)
    if (this.island === island) return

    if (this.island) {
      this.island.classList.remove('selected')
    }

    this.island = island
    this.island.classList.add('selected')
    this.islands.splashScreen(island.dataset.splash)

    this.islands.selectecd = island

    if (this.isocodes && this.isocodes[0]) {
      this.highlight(this.isocodes, false)
    }

    this.isocodes = null

    // console.log('islands list', this.islands.list, island.dataset.id)

    var info = this.islands.list[island.dataset.id]

    this.emit('island', info)
  },

  unSelectIsland () {
    if (this.island) {
      this.island.classList.remove('selected')
      this.island = null
    }
  }
}

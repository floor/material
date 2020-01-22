
export default {
  initFilter () {
    this.filter = this.extractFilter(this.ui)

    for (var name in this.filter) {
      if (this.filter.hasOwnProperty(name)) {
        this.filter[name].on('change', () => {
          this.fetch()
        })
      }
    }

    this.ui['filter-clear'].on('click', () => {
      this.clearFilter()
    })

    this.ui['filter'].on('click', () => {
      this.toggleFilter()
    })
  },

  toggleFilter () {
    if (this.ui['filter-input'].contains('show')) {
      this.ui['filter-input'].remove('show')
    } else {
      this.ui['filter-input'].add('show')
    }
  },

  /**
   * [showSearch description]
   * @return {[type]} [description]
   */
  showFilter () {
    // console.log('showSearch')
    this.ui['filter'].root.classList.add('selected')
    this.ui['filter-input'].root.classList.add('show')

    // this.ui['search-list'].classList.add('show')
    // this.ui.body.classList.add('hide')
    this.ui['filter-input'].input.focus()
  },

  /**
   * [hideSearch description]
   * @return {[type]} [description]
   */
  hideFilter () {
    // console.log('hideSearch')
    this.ui['filter'].root.classList.remove('selected')
    this.ui['filter-input'].root.classList.remove('show')
    // this.ui['search-list'].classList.remove('show')
    // this.ui.body.classList.remove('hide')
    this.fetch()
  },

  clearFilter () {
    for (var name in this.filter) {
      if (this.filter.hasOwnProperty(name)) {
        this.filter[name].set('')
      }
    }

    this.fetch()
  },

  extractFilter (object) {
    // console.log('extractField', object)

    var filter = {}

    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        var str = property.split(/\./)

        if (str[0] === 'filter' && str[1] !== undefined) {
          var name = property.substr(7, property.length)
          console.log('field', name, property)

          filter[name] = object[property]
        }
      }
    }

    return filter
  }
}

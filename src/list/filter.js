
export default {
  initFilter () {
    this.filter = this.extractFilter(this.ui)

    for (var name in this.filter) {
      if (this.filter.hasOwnProperty(name)) {
        this.filter[name].on('change', () => {
          this.request()
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

  getFilter () {
    console.log('getFilter')
    var filter = null
    for (var name in this.filter) {
      if (this.filter.hasOwnProperty(name)) {
        console.log('--', typeof this.filter[name].get(), this.filter[name].get())
        if (this.filter[name].get() !== ''/* && this.filter[name].get() !== [] */) {
          if (filter) {
            filter = filter + '&' + name + '=' + this.filter[name].get()
          } else {
            filter = name + '=' + this.filter[name].get()
          }
        }
      }
    }

    // console.log('filter', filter)

    return filter
  },

  toggleFilter () {
    // console.log('toggleFilter', this.ui['filter-input'])

    if (this.ui['filter-input'].classList.contains('show')) {
      this.hideFilter()
    } else {
      this.showFilter()
    }
  },

  /**
   * [showSearch description]
   * @return {[type]} [description]
   */
  showFilter () {
    if (this.hideSearch) {
      this.hideSearch()
    }

    // console.log('showSearch')
    this.ui['filter'].root.classList.add('selected')
    this.ui['filter-input'].classList.add('show')

    // this.ui['search-list'].classList.add('show')
    // this.ui.body.classList.add('hide')
  },

  /**
   * [hideSearch description]
   * @return {[type]} [description]
   */
  hideFilter () {
    // console.log('hideSearch')
    this.ui['filter'].root.classList.remove('selected')
    this.ui['filter-input'].classList.remove('show')
    // this.ui['search-list'].classList.remove('show')
    // this.ui.body.classList.remove('hide')
    this.clearFilter()
    this.request()
  },

  clearFilter () {
    for (var name in this.filter) {
      if (this.filter.hasOwnProperty(name)) {
        this.filter[name].set('')
      }
    }

    this.request()
  },

  extractFilter (object) {
    // console.log('extractField', object)

    var filter = {}

    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        var str = property.split(/\./)

        if (str[0] === 'filter' && str[1] !== undefined) {
          var name = property.substr(7, property.length)

          filter[name] = object[property]
        }
      }
    }

    return filter
  }
}

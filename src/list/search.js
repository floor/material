export default {
  /**
   * [search description]
   * @param  {[type]} ev [description]
   * @return {[type]}    [description]
   */
  search (keywords, page, size) {
    // console.log('search', keywords)

    if (this.controller) {
      this.controller.abort()
    }

    page = page || 1
    size = size || this.options.list.size

    this.controller = new AbortController()
    var signal = this.controller.signal

    var route = this.buildRoute(page, size, 'search')

    if (route.indexOf('?') > -1) {
      route = route + '&search=' + keywords
    } else {
      route = route + '?search=' + keywords
    }

    fetch(route, {signal}).then((resp) => {
      return resp.json()
    }).then((data) => {
      this.data = data

      this.storeData(data)

      // console.log('list', list)

      this.renderSearch(data)
    }).catch(function (e) {
      // console.log('error', e.message)
    })
  },

  renderSearch (list) {
    this.ui.body.innerHTML = ''
    // console.log('render', list.length, list)
    for (var i = 0; i < list.length; i++) {
      var info = list[i]
      this.renderItem(info, 'search')
    }
  },

  cancelSearch () {
    console.log('cancel search')
    this.ui.body.innerHTML = ''
  },

  /**
   * [toggleSearch description]
   * @return {[type]} [description]
   */
  toggleSearch (e) {
    e.stopPropagation()
    // console.log('toggle search', this.ui.body)
    if (!this.ui['search-input'].root.classList.contains('show')) {
      this.showSearch()
    } else {
      this.hideSearch()
    }
  },

  /**
   * [showSearch description]
   * @return {[type]} [description]
   */
  showSearch () {
    // console.log('showSearch')
    this.mode = 'search'
    this.ui['search'].root.classList.add('selected')
    this.ui['search-input'].input.value = ''
    this.ui['search-input'].root.classList.add('show')

    this.ui.body.innerHTML = ''

    // this.ui['search-list'].classList.add('show')
    // this.ui.body.classList.add('hide')
    this.ui['search-input'].input.focus()
  },

  /**
   * [hideSearch description]
   * @return {[type]} [description]
   */
  hideSearch () {
    // console.log('hideSearch')
    this.mode = 'standard'
    this.ui['search'].root.classList.remove('selected')
    this.ui['search-input'].root.classList.remove('show')
    this.ui['search-input'].input.value = ''
    // this.ui['search-list'].classList.remove('show')
    // this.ui.body.classList.remove('hide')
    this.fetch()
  }

}

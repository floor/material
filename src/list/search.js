export default {
  /**
   * [search description]
   * @param  {[type]} ev [description]
   * @return {[type]}    [description]
   */
  search (keywords, page, size) {
    // console.log('search', keywords)

    this.ui.body.innerHTML = ''

    if (this.abortController) {
      this.abortController.abort()
    }

    this.abortController = new AbortController()
    var signal = this.abortController.signal

    page = page || 1
    size = size || this.options.list.size

    var route = this.buildRoute(page, size, 'search')

    route = this.addParams(route, 'search=' + keywords)

    // console.log('route', route)

    fetch(route, {signal}).then((resp) => {
      return resp.json()
    }).then((data) => {
      // console.log('data', data)
      this.storeData(data)

      this.data = data

      // console.log('list', list)

      this.render(data)
      this.emit('fetched', data)
    }).catch(function (e) {
      // console.log('error', e.message)
    })
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
    if (this.hideFilter) {
      this.hideFilter()
    }

    // console.log('showSearch')
    this.mode = 'search'
    this.root.classList.add('search-mode')
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
    this.root.classList.remove('search-mode')
    this.ui['search'].root.classList.remove('selected')
    this.ui['search-input'].root.classList.remove('show')
    this.ui['search-input'].input.value = ''
    // this.ui['search-list'].classList.remove('show')
    // this.ui.body.classList.remove('hide')
    this.fetch()
  }

}

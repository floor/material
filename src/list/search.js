export default {
  /**
   * [search description]
   * @param  {[type]} ev [description]
   * @return {[type]}    [description]
   */
  search (keywords) {
    // console.log('search', keywords)

    fetch(this.options.route.search + '?search=' + keywords).then((resp) => {
      return resp.json()
    }).then((list) => {
      if (this.options.store) {
        this.storeData(list)
      }
      // console.log('list', list)
      this.ui['search-list'].innerHTML = ''
      this.renderSearch(list)
    })
  },

  renderSearch (list) {
    // console.log('render', list.length, list)
    for (var i = 0; i < list.length; i++) {
      var info = list[i]
      this.renderItem(info, 'search')
    }
  },

  cancelSearch () {
    this.ui['search-list'].innerHTML = ''
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
      if (this.ui.delete) { this.ui.delete.disable() }
    } else {
      this.hideSearch()
      if (this.ui.delete) { this.ui.delete.enable() }
    }
  },

  /**
   * [showSearch description]
   * @return {[type]} [description]
   */
  showSearch () {
    // console.log('showSearch')

    this.ui['search'].root.classList.add('selected')
    this.ui['search-input'].root.classList.add('show')
    this.ui['search-list'].classList.add('show')
    this.ui.body.classList.add('hide')
    this.ui['search-input'].input.focus()
  },

  /**
   * [hideSearch description]
   * @return {[type]} [description]
   */
  hideSearch () {
    // console.log('hideSearch')
    this.ui['search'].root.classList.remove('selected')
    this.ui['search-input'].root.classList.remove('show')
    this.ui['search-list'].classList.remove('show')
    this.ui.body.classList.remove('hide')
  }

}

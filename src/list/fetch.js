export default {
  fetch (page, size) {
    page = page || 1
    size = size || this.options.list.size
    // console.log('fetch')

    var route = this.buildRoute(page, size)

    this.ui.body.innerHTML = ''
    // console.log('route', route)

    fetch(route).then((resp) => {
      return resp.json()
    }).then((data) => {
      // console.log('data', route, data)

      this.storeData(data)

      this.data = data
      if (this.status) {
        // console.log('count', data.length)
        this.status('count', data.length)
      }

      this.render(data)
      if (this.hideSearch) {
        this.hideSearch()
      }

      this.emit('fetched', data)
    })
  },

  buildRoute (index, size) {
    index = index || 1
    size = size || this.options.list.size
    var params = ''

    var route = this.options.route.list

    if (this.params) {
      params = this.params() || ''
    }

    route = route + params

    if (index === 1) {
      this.ui.body.scrolltop = 0
    }

    if (this.options.pagination) {
      // console.log('pagination', route.indexOf('?'), route)

      if (route.indexOf('?') > -1) {
        route = route + '&page=' + index + '&size=' + size
      } else {
        route = route + '?page=' + index + '&size=' + size
      }
    }

    return route
  },

  storeData (list) {
    // console.log('storeData', this.dataStore)
    this.dataStore = this.dataStore || {}
    for (var i = 0; i < list.length; i++) {
      this.dataStore[list[i]._id] = list[i]
    }
  }
}

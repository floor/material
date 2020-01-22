export default {
  fetch (page, size) {
    if (this.controller) {
      this.controller.abort()
    }

    this.controller = new AbortController()
    var signal = this.controller.signal

    page = page || 1
    size = size || this.options.list.size
    // console.log('fetch')

    var route = this.buildRoute(page, size)

    this.ui.body.innerHTML = ''
    // console.log('route', route)

    fetch(route, {signal}).then((resp) => {
      return resp.json()
    }).then((data) => {
      // console.log('data', route, data)

      this.storeData(data)

      this.data = data

      this.render(data)

      this.emit('fetched', data)
    }).catch(function (e) {
      // console.log('error', e.message)
    })
  },

  buildRoute (page, size, path) {
    path = path || 'list'

    page = page || 1
    size = size || this.options.list.size
    var params = ''

    var route = this.options.route[path]

    if (this.params) {
      params = this.params() || ''
    }

    if (route.indexOf('?') > -1) {
      route = route + params
    } else {
      route = route + '?' + params
    }

    if (page === 1) {
      this.ui.body.scrolltop = 0
    }

    if (this.options.pagination) {
      // console.log('pagination', route.indexOf('?'), route)

      if (route.indexOf('?') > -1) {
        route = route + '&page=' + page + '&size=' + size
      } else {
        route = route + '?page=' + page + '&size=' + size
      }
    }

    return route
  },

  storeData (list) {
    this.dataList = []
    // console.log('storeData', this.dataStore)
    this.dataStore = this.dataStore || {}
    for (var i = 0; i < list.length; i++) {
      this.dataList.push(list[i]._id)
      this.dataStore[list[i]._id] = list[i]
    }
  }
}

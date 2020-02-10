export default {
  fetch (page, size, more) {
    // console.log('fetch', page, size, more)
    if (more !== true) {
      this.ui.body.innerHTML = ''
    }
    this.data = this.data || []
    var signal = null

    if (this.abortController) {
      // console.log('abort')
      this.abortController.abort()
      this.abortController = null
    }

    if (more !== true) {
      this.abortController = new AbortController()
      signal = this.abortController.signal
    }

    page = page || 1
    size = size || this.options.list.size
    // console.log('fetch')

    if (page === 1) {
      this.ui.body.scrolltop = 0
    }

    var route = this.buildRoute(page, size)

    fetch(route, {signal}).then((resp) => {
      return resp.json()
    }).then((data) => {
      if (this.options.debug) {
        console.log('data', route, data.length, data)
      }

      if (more === true) {
        var a = this.data.concat(data)
        this.data = a
        this.storeData(data, more)
        this.virtual.add(this.data)
      } else {
        this.data = []
        this.data = data
        this.storeData(data)
        this.render(data)
      }

      this.emit('fetched', data)
    }).catch(function (e) {
      // console.log('error', e.message)
    })
  },

  addParams (route, params) {
    // console.log('addParams', route, params)

    if (!route) {
      console.log('error: no route specified!')

      return
    }

    if (route.indexOf('?') > -1) {
      // console.log('?', route, route.length, route[route.length - 1])
      if (route[route.length - 1] === '&' || route[route.length - 1] === '?') {
        route = route + params
      } else {
        route = route + '&' + params
      }
    } else {
      // console.log('add ?')
      route = route + '?' + params
    }

    return route
  },

  buildRoute (page, size, path) {
    // console.log('buildroute', this.options.route, path)
    path = path || 'list'

    page = page || 1
    size = size || this.options.list.size

    var route = this.options.route

    if (path) {
      route = this.options.route[path]
    }

    if (this.routeAddOn) {
      route = this.routeAddOn(route)
    }

    if (this.params) {
      // console.log('params', route, this.params())
      route = this.addParams(route, this.params())
    }

    if (this.ui.filter && this.ui.filter.root.classList.contains('selected')) {
      route = this.addParams(route, this.getFilter())
    }

    if (this.options.pagination) {
      route = this.addParams(route, 'page=' + page + '&size=' + size)
    }

    return route
  },

  storeData (list, more) {
    // console.log('storeData', list.length, more)
    if (more !== true) {
      this.dataList = []
    }

    // console.log('storeData', this.dataStore)
    this.dataStore = this.dataStore || {}
    for (var i = 0; i < list.length; i++) {
      this.dataList.push(list[i]._id)
      this.dataStore[list[i]._id] = list[i]
    }
  }
}

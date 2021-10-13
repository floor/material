export default {
  fetch (page, size, more, cb) {
    // console.log('fetch', page, size, more)
    if (more !== true) {
      this.ui.body.innerHTML = ''
      this.virtual.reset()
      this.dataList = []
      this.data = []
      this.page = 1
      this.stop = true
    }

    this.data = this.data || []
    var signal = null

    if (this.abortController) {
      // console.log('abort')
      this.abortController.abort()
      this.abortController = null
    }

    if (more !== true && window.AbortController) {
      this.abortController = new AbortController()
      signal = this.abortController.signal
    }

    page = page || 1
    size = size || this.options.list.size
    // console.log('size', this.options.name, size)

    if (page === 1) {
      this.ui.body.scrolltop = 0
    }

    var route = this.buildRoute(page, size)

    if (more !== true && this.options.count) {
      this.fetchCount(route)
    }

    // console.log('route', route)

    fetch(route, {signal}).then((resp) => {
      return resp.json()
    }).then((data) => {
      if (this.options.debug) {
        console.log('data', route, data.length, data)
      }

      /// console.log('data-length', data.length)

      // console.log('route', route);

      data = data || []

      if (data.error) {
        console.log('error', data.error)
        return
      }

      if (data.length < this.size && more) {
        this.stop = true
      } else {
        this.stop = false
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

      if (page === 1 && data.length < 1) {
        this.emit('empty')
      }

      if (cb) {
        cb()
      }
    }).catch(function (e) {
      // console.log('error', e.message)
    })
  },

  fetchCount (route, signal) {
    // console.log('fetchCount', route)
    fetch(route + '&count=1', {signal}).then((resp) => {
      return resp.json()
    }).then((data) => {
      // console.log('data', data.count)
      this.count = data.count
      this.statusDisplay('count', data.count)
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
      route = this.routeAddOn(route, path)
    }

    if (this.params && this.params()) {
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

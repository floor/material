export default {
  fetch (page, size) {
    // console.log('fetch')
    page = page || 1
    size = size || this.options.list.size
    var params = '?'
    var pagination = '&page=' + page + '&size=' + size

    if (this.params) {
      params = this.params()
    }

    if (page === 1) {
      this.ui.body.scrolltop = 0
    }

    var url = this.options.route.list + params + pagination

    fetch(url).then((resp) => {
      return resp.json()
    }).then((data) => {
      console.log('data', data, this.status)

      this.store(data)

      this.data = data
      if (this.status) {
        // console.log('count', data.length)
        this.status('count', data.length)
      }

      this.render(data)
      if (this.hideSearch) {
        this.hideSearch()
      }

      this.emit('fetched')
    })
  },

  store (list) {
    this.dataStore = this.dataStore = {}
    for (var i = 0; i < list.length; i++) {
      this.dataStore[list[i]._id] = list[i]
    }
  }
}

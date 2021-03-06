import Layout from '../layout'

export default {
  update (info) {
    // console.log('update', info)

    this.getUpdatedInfo(info._id)
  },

  getUpdatedIndex (id) {
    // console.log('getUpdatedIndex', id)
    var index = null
    for (var i = 0; i < this.data.length; i++) {
      // console.log('--', this.data[i]._id, id)
      if (this.data[i]._id === id) {
        index = i
        break
      }
    }

    return index
  },

  getUpdatedInfo (id) {
    // console.log('getUpdatedInfo', id)
    var index = this.getUpdatedIndex(id)
    // console.log('index', index)
    var route = this.buildRoute(index + 1, 1)
    // console.log('roote', route)
    fetch(route).then((resp) => {
      return resp.json()
    }).then((data) => {
      // console.log('info', data)
      this.updateUpdatedInfo(data[0], index, id)
    })
  },

  updateUpdatedInfo (info, index, id) {
    // console.log('updateUpdatedInfo', info, index)

    if (!info) return
    if (info._id !== id) return

    this.info = info

    // update datalist
    this.data[index] = info

    // update datastore
    this.dataStore[info._id] = info

    // update item if on the screen
    var item = this.ui.body.querySelector('[data-id="' + info._id + '"]')
    if (item) {
      item.innerHTML = ''
      var layout = new Layout(this.options.layout.item, item)

      this.renderInfo(layout, info)
    }
  }
}

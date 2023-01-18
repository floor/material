import Layout from '../layout'

export default {
  update (info) {
    // console.log('update', info)

    this.getUpdatedInfo(info[this.dataId])
  },

  getUpdatedIndex (id) {
    // console.log('getUpdatedIndex', id)
    var index = null
    for (var i = 0; i < this.data.length; i++) {
      // console.log('--', this.data[i][this.dataId], id)
      if (this.data[i][this.dataId] === id) {
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
    if (info[this.dataId] !== id) return

    this.info = info

    // update datalist
    this.data[index] = info

    // update datastore
    this.dataStore[info[this.dataId]] = info

    // update item if on the screen
    var item = this.ui.body.querySelector('[data-id="' + info[this.dataId] + '"]')
    if (item) {
      item.innerHTML = ''
      var layout = new Layout(this.options.layout.item, item)

      this.renderInfo(layout, info)
    }
  }
}

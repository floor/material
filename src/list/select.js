export default {
  select (item, silent) {
    // console.log('select', item.dataset.id)
    if (!item || !item.dataset.id) return

    var id = item.dataset.id

    this.index = this.dataList.indexOf(id)
    this.info = this.dataStore[id]

    if (this.options.preventSelectAgain && this.id === id) {
      return
    }

    var selected = this.ui.body.querySelector('.selected')
    if (selected) selected.classList.remove('selected')

    if (id) {
      this.highlight(item)
      this.item = item
      this.id = id

      if (silent !== true) {
        this.emit('select', id)
        this.emit('selectItem', item)
      }
    } else {
      this.id = null
      this.item = null
    }
  },

  unselect () {
    // console.log('unselect')
    this.id = null
    if (this.item) {
      this.item.classList.remove('selected')
    }
    this.index = null
    this.item = null
  },

  selectById (id, silent) {
    // console.log('selectById', id)

    if (!this.dataList) {
      return false
    }

    var index = this.dataList.indexOf(id)
    if (index < 0) {
      console.log('can\'t selectid, not in the list')
      return false
    }

    this.index = index
    this.id = id

    this.selectItemById(id, 'down')

    return id
  },

  selectItemById (id, direction) {
    // console.log('select')
    var item = this.ui.body.querySelector('[data-id="' + id + '"]')

    if (!item) return

    // if (this.item) this.item.classList.remove('selected')

    var selected = this.ui.body.querySelector('.selected')
    if (selected) selected.classList.remove('selected')

    this.item = item
    item.classList.add('selected')

    if (this.options.updatePosition === true) {
      this.selectPosition(item, direction)
    }

    return item
  },

  selectPosition (item, direction) {
    // console.log('selectPosition', item, direction)
    // return
    if (!this.coord) {
      this.coord = this.ui.body.getBoundingClientRect()
    }

    var itemTop = item.offsetTop + this.coord.top - this.ui.body.scrollTop

    if (direction === 'down' && itemTop + this.options.item.height > this.coord.height) {
      this.ui.body.scrollTop = this.ui.body.scrollTop + itemTop - this.coord.height
    }

    if (direction === 'up' && itemTop < this.coord.top) {
      this.ui.body.scrollTop = this.ui.body.scrollTop + itemTop - this.coord.top
    }
  },

  selectNext (silent) {
    // console.log('selectNext', this.id)
    var idx = this.dataList.indexOf(this.id)

    var id = this.dataList[idx + 1]

    // console.log('id', id)

    if (id) {
      this.id = id
      // console.log('item', item)
      this.selectItemById(id, 'down')

      if (silent !== true) {
        this.emit('select', id)
      }
      return id
    } else {
      return false
    }
  },

  selectPrevious (silent) {
    // console.log('selectPrevious', this.id)
    var idx = this.dataList.indexOf(this.id)

    var id = this.dataList[idx - 1]

    if (id) {
      this.id = id
      // console.log('item', item)
      this.selectItemById(id, 'up')

      if (silent !== true) {
        this.emit('select', id)
      }
      return id
    } else {
      return false
    }
  },

  highlight (item) {
    if (this.item) {
      this.item.classList.remove('selected')
    }
    item.classList.add('selected')
  },

  selectCreated (info, item) {
    // console.log('select create', info, this.item)
    if (this.item) {
      this.item.classList.remove('selected')
    }

    item.classList.add('selected')

    this.emit('selectCreate', info)
  }
}

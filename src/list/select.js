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
    console.log('unselect')
    this.id = null
    if (this.item) {
      this.item.classList.remove('selected')
    }
    this.index = null
    this.item = null
  },

  selectById (id) {
    // console.log('selectById', id, this.dataList)
    //
    var index = this.dataList.indexOf(id)
    if (index < 0) {
      console.log('can\'t selectid, not in the list')
      return false
    }

    this.index = index
    this.id = id

    // console.log('item', item)
    this.selectItemById(id)

    return id
  },

  selectItemById (id) {
    // console.log('select')
    var item = this.ui.body.querySelector('[data-id="' + id + '"]')

    if (!item) return

    var selected = this.ui.body.querySelector('.selected')
    if (selected) selected.classList.remove('selected')

    this.item = item
    item.classList.add('selected')

    return item
  },

  selectNext () {
    // console.log('selectNext', this.id)
    var idx = this.dataList.indexOf(this.id)

    var id = this.dataList[idx + 1]

    if (id) {
      this.selectById(id)
      return id
    } else {
      return false
    }
  },

  selectPrevious () {
    console.log('selectNext', this.id)
    var idx = this.dataList.indexOf(this.id)

    var id = this.dataList[idx - 1]

    if (id) {
      this.selectById(id)
      return id
    } else {
      return false
    }
  },

  next () {
    // console.log('next', this.item)
    if (this.item && this.item.nextSibling) {
      this.select(this.item.nextSibling)
    } else {
      if (!this.item && this.ui.body.firstChild) {
        this.select(this.ui.body.firstChild)
      }
    }
  },

  previous () {
    // console.log('previous', this.item)
    if (this.item && this.item.previousSibling) {
      this.select(this.item.previousSibling)
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

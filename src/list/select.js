export default {
  select (item, silent) {
    // console.log('select', item)
    if (!item || !item.dataset.id) return

    var id = item.dataset.id

    if (this.options.preventSelectAgain && this.id === id) {
      return
    }

    var selected = this.ui.body.querySelector('.selected')
    if (selected) selected.classList.remove('selected')

    if (id) {
      this.highlight(item)
      this.item = item
      this.id = id
      if (this.ui.delete) { this.ui.delete.enable() }

      if (silent !== true) {
        this.emit('select', id)
        this.emit('selectItem', item)
      }
    } else {
      this.id = null
      this.item = null

      if (this.ui.delete) {
        this.ui.delete.disable()
      }
    }
  },

  selectById (id, silent) {
    // console.log('selectById', this.ui.body)
    var item = this.ui.body.querySelector('[data-id="' + id + '"]')
    // console.log('item', item)
    this.select(item, silent)
  },

  unselect () {
    this.id = null
    if (this.item) {
      this.item.classList.remove('selected')
    }
    this.item = null
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

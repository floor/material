export default {

  status (prop, info) {
    if (prop === 'count') {
      this.statusCount(info)
    }
  },

  statusCount (count) {
    var items = 'items'
    if (this.status && this.status.count && this.status.count.name) {
      items = this.status.count.name
    }

    if (this.ui.count) {
      this.ui.count.innerHTML = '<span class="number">' + count + '</span> ' + items
    }
  }
}

export default {
  remove (id) {
    // console.log('remove', id, this.ui.body)

    if (!this.dataStore[id]) {
      console.log('not in the list')
      return
    }

    console.log('data1', this.data.length)

    this.data = this.data.filter(function (info) { return info._id !== id })

    console.log('data2', this.data.length)

    this.render(this.data)
  }
}

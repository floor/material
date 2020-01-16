export default {
  remove (id) {
    // console.log('remove', id, this.ui.body)

    if (!this.dataStore[id]) {
      // console.log('not in the list')
      return
    }

    // remove id from the list
    this.data = this.data.filter((info) => { return info._id !== id })

    this.virtual.update(this.data)
  }
}

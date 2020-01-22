export default {
  remove (id) {
    // console.log('remove', id, this.dataList)

    if (!this.dataStore[id]) {
      // console.log('not in the list')
      return
    }

    this.dataList.splice(this.dataList.indexOf(id), 1)

    // remove id from the list
    this.data = this.data.filter((info) => { return info._id !== id })

    this.virtual.update(this.data)
  }
}

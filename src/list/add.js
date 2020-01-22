
export default {
  add (info, context) {
    console.log('list add', info)

    if (!this.dataStore) return
    context = context || null

    this.dataList = this.dataList || []

    if (context === 'bottom') {
      this.data.push(info)
      this.dataList.push(info._id)
    } else {
      this.data.unshift(info)
      this.dataList.unshift(info._id)
    }

    this.dataStore[info._id] = info
    // console.log('data', this.data.length, this.data)
    this.virtual.update(this.data)

    return info
  }
}

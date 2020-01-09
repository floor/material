
export default {
  add (info, context) {
    // console.log('data add', this.dataStore[info._id])
    context = context || null

    if (this.dataStore[info._id]) {
      // console.log('already in the list')
      return
    }

    if (context === 'bottom') {
      this.data.push(info)
    } else {
      this.data.unshift(info)
    }

    this.dataStore[info._id] = info
    // console.log('data', this.data.length, this.data)
    this.render(this.data)
  }
}
